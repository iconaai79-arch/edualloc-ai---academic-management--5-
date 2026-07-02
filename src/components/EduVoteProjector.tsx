import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Users, Award, BarChart2, Shield, Calendar, Layers, Clock, AlertCircle, ArrowLeft
} from 'lucide-react';
import { apiService } from '../services/apiService';
import type { User, ElectionEvent, ElectionCandidate, ElectionBallot } from '../types';

interface EduVoteProjectorProps {
    electionId: string;
    onBack: () => void;
}

export const EduVoteProjector: React.FC<EduVoteProjectorProps> = ({ electionId, onBack }) => {
    const [election, setElection] = useState<ElectionEvent | null>(null);
    const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
    const [ballots, setBallots] = useState<ElectionBallot[]>([]);
    const [studentsCount, setStudentsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);

    // Mask/Reveal States
    const [isMasked, setIsMasked] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    // Fetch Election Data and Votes
    const fetchData = useCallback(async () => {
        try {
            const instId = election?.institutionId || 'GLOBAL';
            
            // Fetch election event details
            const [elecData, candData, ballotsData, usersData] = await Promise.all([
                apiService.fetchModuleRecords('election_events').then(list => (list || []).find((e: any) => e.id === electionId)),
                apiService.fetchModuleRecords('election_candidates').then(list => (list || []).filter((c: any) => c.electionId === electionId && c.status === 'approved')),
                apiService.fetchModuleRecords('election_ballots').then(list => (list || []).filter((b: any) => b.electionId === electionId)),
                apiService.fetchModuleRecords('users').catch(() => [])
            ]);

            if (elecData) {
                setElection(elecData);
                setCandidates(candData);
                setBallots(ballotsData);
                setUsers(usersData);

                // Filter students of current institution
                const instStudents = (usersData || []).filter(
                    (u: any) => u.role === 'student' && u.institutionId === elecData.institutionId
                );
                setStudentsCount(instStudents.length || 100); // fallback to 100 to prevent division by zero
            }
        } catch (error) {
            console.error('[EduVoteProjector] Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, [electionId, election?.institutionId]);

    useEffect(() => {
        fetchData();
        // Setup polling every 4 seconds for real-time live boarding
        const interval = setInterval(fetchData, 4000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Unmask results automatically if closed
    useEffect(() => {
        if (election && election.status === 'closed' && isMasked && countdown === null) {
            // Trigger Reveal Countdown
            setCountdown(5);
        }
    }, [election?.status, isMasked, countdown]);

    // Countdown effect
    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setIsMasked(false);
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 8000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Calculate unique voters who cast at least one ballot (using receiptHash check)
    const uniqueVoterReceipts = useMemo(() => {
        const uniqueHashes = new Set(ballots.map(b => b.receiptHash));
        return uniqueHashes.size;
    }, [ballots]);

    // Calculate voter turnout percentage
    const turnoutPercent = useMemo(() => {
        if (studentsCount === 0) return 0;
        return Math.round((uniqueVoterReceipts / studentsCount) * 100);
    }, [uniqueVoterReceipts, studentsCount]);

    // Calculate vote counts per candidate grouped by category/position
    const resultsByPosition = useMemo(() => {
        const grouped: Record<string, Record<string, number>> = {};
        
        // Count votes (only first preferences if ranked choice)
        ballots.forEach(b => {
            if (b.candidateId && (b.preferenceRank === 1 || !b.preferenceRank)) {
                if (!grouped[b.position]) grouped[b.position] = {};
                if (!grouped[b.position][b.candidateId]) grouped[b.position][b.candidateId] = 0;
                grouped[b.position][b.candidateId]++;
            }
        });

        // Enrich with profiles and sort candidates by vote count
        const sortedGrouped: Record<string, Array<{
            candidateId: string;
            studentName: string;
            studentPhoto: string | null;
            votes: number;
            percentage: number;
        }>> = {};

        Object.entries(candidates.reduce((acc, c) => {
            if (!acc[c.position]) acc[c.position] = [];
            acc[c.position].push(c);
            return acc;
        }, {} as Record<string, ElectionCandidate[]>) || {}).forEach(([pos, cands]) => {
            const posVotes = grouped[pos] || {};
            const totalPosVotes = Object.values(posVotes).reduce((sum, v) => sum + v, 0) || 1; // prevent zero division

            const list = cands.map(c => {
                const profile = users.find(u => u.id === c.studentId);
                const votes = posVotes[c.id] || 0;
                return {
                    candidateId: c.id,
                    studentName: profile?.name || 'Unknown Candidate',
                    studentPhoto: c.posterUrl || (profile as any)?.photoUrl || (profile as any)?.photo || null,
                    votes,
                    percentage: Math.round((votes / totalPosVotes) * 100)
                };
            });

            // Sort highest votes first
            list.sort((a, b) => b.votes - a.votes);
            sortedGrouped[pos] = list;
        });

        return sortedGrouped;
    }, [ballots, candidates, users]);

    return (
        <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans p-6 lg:p-12 relative overflow-hidden select-none">
            <style>{`
                @keyframes floating {
                    0% { transform: translateY(0px) scale(1); }
                    50% { transform: translateY(-4px) scale(1.03); }
                    100% { transform: translateY(0px) scale(1); }
                }
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                @keyframes spin-gradient {
                    100% { transform: rotate(360deg); }
                }
                .animated-candidate-photo {
                    animation: floating 3s ease-in-out infinite, pulse-glow 2s infinite;
                }
                .gradient-border-wrap {
                    position: relative;
                    background: linear-gradient(to right, #6366f1, #a855f7, #ec4899);
                    padding: 2.5px;
                    border-radius: 9999px;
                    overflow: hidden;
                    display: inline-block;
                }
                .gradient-border-wrap::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: conic-gradient(#6366f1, #a855f7, #ec4899, #6366f1);
                    animation: spin-gradient 4s linear infinite;
                    border-radius: 50%;
                }
                .gradient-border-inner {
                    position: relative;
                    background: #090e1f;
                    border-radius: 9999px;
                }
            `}</style>
            {/* Grid Glowing Accents */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-650/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-650/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Back Navigation Bar */}
            <div className="flex justify-between items-center mb-10 z-10 relative">
                <button
                    onClick={onBack}
                    className="px-5 py-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl text-[10px] uppercase font-black tracking-widest flex items-center gap-2 transition-all text-slate-400 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Console
                </button>
                <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute" />
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Connection</span>
                </div>
            </div>

            {loading || !election ? (
                <div className="flex flex-col items-center justify-center py-40">
                    <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Calibrating Projector Screen...</p>
                </div>
            ) : (
                <div className="max-w-6xl mx-auto space-y-12">
                    {/* Top Board Name Display */}
                    <div className="text-center space-y-3">
                        <h2 className="text-[11px] font-black uppercase text-indigo-400 tracking-[0.4em] flex items-center justify-center gap-2">
                            <Layers className="w-4 h-4" /> {election.votingSystem === 'ranked_choice' ? 'Ranked-Choice Election Board' : 'FPTP Electoral Board'}
                        </h2>
                        <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight text-white drop-shadow-md">
                            {election.title}
                        </h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            {new Date(election.startTime).toLocaleTimeString()} - {new Date(election.endTime).toLocaleTimeString()}
                        </p>
                    </div>

                    {/* Stats Summary Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Registered Students */}
                        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800/80 flex items-center gap-4 shadow-xl">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Users className="w-7 h-7 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-white">{studentsCount}</p>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Eligible Voters</p>
                            </div>
                        </div>

                        {/* Votes Counted */}
                        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800/80 flex items-center gap-4 shadow-xl">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Shield className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-white">{uniqueVoterReceipts}</p>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ballots Cast</p>
                            </div>
                        </div>

                        {/* Turnout Gauge */}
                        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-slate-800/80 flex items-center gap-4 shadow-xl">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <Clock className="w-7 h-7 text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-3xl font-black text-white">{turnoutPercent}%</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Turnout</span>
                                </div>
                                <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${turnoutPercent}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COUNTDOWN REVEAL SCREEN */}
                    {countdown !== null && countdown > 0 && (
                        <div className="bg-slate-900/50 backdrop-blur-md p-16 rounded-[4rem] border border-indigo-900/40 text-center max-w-xl mx-auto shadow-2xl animate-pulse">
                            <h3 className="text-lg font-black uppercase tracking-[0.3em] text-indigo-400 mb-6">Declaring Winners</h3>
                            <div className="w-32 h-32 rounded-full border-4 border-indigo-500/30 flex items-center justify-center mx-auto text-7xl font-black text-white bg-indigo-950/20 shadow-xl shadow-indigo-500/10">
                                {countdown}
                            </div>
                            <p className="text-xs text-slate-450 uppercase tracking-widest mt-8 font-black">Hold your breath for the reveal...</p>
                        </div>
                    )}

                    {/* CONFETTI DROPS SCREEN */}
                    {showConfetti && (
                        <div className="fixed inset-0 pointer-events-none z-[1000] flex justify-center items-center overflow-hidden">
                            <div className="absolute text-5xl font-black text-white tracking-widest select-none animate-ping">
                                ELECTION CLOSED
                            </div>
                        </div>
                    )}

                    {/* VOTING DATA DISPLAY (MASKED vs REVEALED) */}
                    {countdown === null && isMasked && election.status !== 'closed' ? (
                        <div className="bg-slate-900/30 backdrop-blur-sm p-16 rounded-[4rem] border border-slate-800 text-center max-w-xl mx-auto">
                            <Clock className="w-20 h-20 text-indigo-500 mx-auto mb-6 animate-pulse" />
                            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Polling In Progress</h3>
                            <p className="text-slate-450 text-xs mb-8">Results are masked to protect voter neutrality and prevent herd voting. Live turnout continues to stream above.</p>
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-[9px] uppercase tracking-widest font-black text-slate-400">
                                <AlertCircle className="w-4 h-4 text-amber-500" /> Results unlock when election closes
                            </div>
                        </div>
                    ) : (
                        (countdown === null || countdown === 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                                {Object.entries(resultsByPosition).map(([pos, list]) => {
                                    const winner = list[0];
                                    return (
                                        <div 
                                            key={pos} 
                                            className="bg-slate-900/20 backdrop-blur-md p-10 rounded-[3.5rem] border border-slate-800/80 shadow-xl space-y-6 hover:border-slate-800 transition-all relative overflow-hidden"
                                        >
                                            {/* Winner crown indicator */}
                                            {winner && winner.votes > 0 && election.status === 'closed' && (
                                                <div className="absolute right-8 top-8 bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 px-3.5 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest flex items-center gap-1">
                                                    <Award className="w-3.5 h-3.5 text-indigo-400 fill-current animate-pulse" /> Winner Elect
                                                </div>
                                            )}

                                            <div>
                                                <h3 className="text-2xl font-black uppercase tracking-tight text-white">{pos}</h3>
                                                <p className="text-[9px] font-black uppercase text-slate-450 tracking-widest mt-1">Live Vote Allocation</p>
                                            </div>

                                            <div className="space-y-6">
                                                {list.map((cand, idx) => {
                                                    const isTop = idx === 0 && cand.votes > 0;
                                                    return (
                                                        <div key={cand.candidateId} className="space-y-2.5">
                                                            <div className="flex justify-between items-center text-sm font-bold">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`text-xs font-black ${isTop ? 'text-indigo-400' : 'text-slate-500'}`}>
                                                                        #{idx + 1}
                                                                    </span>
                                                                    <div className="gradient-border-wrap animated-candidate-photo shrink-0">
                                                                        <div className="gradient-border-inner p-[1px]">
                                                                            {cand.studentPhoto ? (
                                                                                <img src={cand.studentPhoto} alt={cand.studentName} className="w-12 h-12 rounded-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center font-black text-indigo-400 text-xs">
                                                                                    {cand.studentName?.substring(0, 2).toUpperCase()}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className={isTop ? 'text-white' : 'text-slate-300'}>{cand.studentName}</span>
                                                                </div>
                                                                <span className={isTop ? 'text-indigo-400 font-extrabold' : 'text-slate-400'}>
                                                                    {cand.votes} Votes ({cand.percentage}%)
                                                                </span>
                                                            </div>

                                                            <div className="w-full bg-slate-950/60 h-3 rounded-full overflow-hidden border border-slate-900">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${
                                                                        isTop 
                                                                            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                                                                            : 'bg-slate-700'
                                                                    }`} 
                                                                    style={{ width: `${cand.percentage}%` }} 
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};
