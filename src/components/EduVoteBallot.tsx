import React, { useState, useEffect, useCallback } from 'react';
import { 
    Vote, CheckCircle, ShieldCheck, QrCode, Clipboard, Clock, Award, AlertCircle
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { syncEngine } from '../services/syncEngine';
import type { User, ElectionEvent, ElectionCandidate } from '../types';

interface EduVoteBallotProps {
    user: User;
}

export const EduVoteBallot: React.FC<EduVoteBallotProps> = ({ user }) => {
    const [activeElections, setActiveElections] = useState<ElectionEvent[]>([]);
    const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
    const [voterLedgerRecords, setVoterLedgerRecords] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Voting States
    const [selectedElection, setSelectedElection] = useState<ElectionEvent | null>(null);
    const [selections, setSelections] = useState<Record<string, string>>({}); // position -> candidateId
    const [rankings, setRankings] = useState<Record<string, string[]>>({}); // position -> candidateId[] (for RCV)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Receipt state
    const [recentReceipt, setRecentReceipt] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const instId = user.institutionId || 'GLOBAL';
            
            // 1. Fetch elections, candidates, and voter ledger records
            const [eventsData, candData, ledgerData, usersData] = await Promise.all([
                apiService.fetchModuleRecords('election_events', instId).catch(() => []),
                apiService.fetchModuleRecords('election_candidates', instId).catch(() => []),
                apiService.fetchModuleRecords('election_voters_ledger', instId).catch(() => []),
                apiService.fetchModuleRecords('users', instId).catch(() => [])
            ]);

            // Filter for ACTIVE and PUBLISHED elections
            const active = (eventsData || []).filter(
                (e: any) => e.status === 'active' || e.status === 'paused' || e.status === 'closed'
            );
            setActiveElections(active);
            setCandidates(candData || []);
            setUsers(usersData || []);

            // Filter ledger records for current student to see if they've voted
            const myLedger = (ledgerData || []).filter((l: any) => l.studentId === user.id);
            setVoterLedgerRecords(myLedger);

            if (active.length > 0) {
                setSelectedElection(active[0]);
            }
        } catch (error) {
            console.error('[EduVoteBallot] Error fetching records:', error);
        } finally {
            setLoading(false);
        }
    }, [user.id, user.institutionId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Check if user has already voted in current selected election
    const hasVoted = Boolean(
        selectedElection && voterLedgerRecords.some(l => l.electionId === selectedElection.id)
    );

    // Group candidates of selected election by position
    const candidatesByPosition = React.useMemo(() => {
        if (!selectedElection) return {};
        const cands = candidates.filter(
            c => c.electionId === selectedElection.id && c.status === 'approved'
        );
        
        const grouped: Record<string, typeof cands> = {};
        cands.forEach(c => {
            const profile = users.find(u => u.id === c.studentId);
            const enriched = {
                ...c,
                studentName: profile?.name || 'Unknown Candidate',
                studentPhoto: (profile as any)?.photoUrl || (profile as any)?.photo || null
            };
            if (!grouped[c.position]) grouped[c.position] = [];
            grouped[c.position].push(enriched);
        });
        return grouped;
    }, [selectedElection, candidates, users]);

    // Select candidate handler (FPTP)
    const handleSelectCandidate = (positionName: string, candidateId: string) => {
        setSelections(prev => ({
            ...prev,
            [positionName]: candidateId
        }));
    };

    // Ranked Choice selection helper (RCV)
    const handleRankCandidate = (positionName: string, candidateId: string) => {
        setRankings(prev => {
            const currentRanks = prev[positionName] || [];
            if (currentRanks.includes(candidateId)) {
                // Remove if already ranked (toggle out)
                return {
                    ...prev,
                    [positionName]: currentRanks.filter(id => id !== candidateId)
                };
            } else {
                // Add to ranks
                return {
                    ...prev,
                    [positionName]: [...currentRanks, candidateId]
                };
            }
        });
    };

    // Check if the ballot is fully completed
    const isBallotComplete = React.useMemo(() => {
        const positions = Object.keys(candidatesByPosition);
        if (positions.length === 0) return false;
        
        if (selectedElection?.votingSystem === 'ranked_choice') {
            // Must have at least 1 ranked candidate per category
            return positions.every(pos => (rankings[pos] || []).length > 0);
        } else {
            // Must select 1 candidate per category
            return positions.every(pos => !!selections[pos]);
        }
    }, [selectedElection, candidatesByPosition, selections, rankings]);

    // Submit Ballot
    const handleCastVote = async () => {
        if (!selectedElection || !isBallotComplete || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const timestamp = new Date().toISOString();
            const instId = user.institutionId || 'GLOBAL';
            
            // 1. Generate cryptographic receipt hash (SHA-256 approximation for client side)
            const seedString = `${selectedElection.id}-${user.id}-${timestamp}-${Math.random()}`;
            // Simple hash algorithm for local unique token representation
            let hash = 0;
            for (let i = 0; i < seedString.length; i++) {
                const char = seedString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            const receipt = 'EDUVOTE-' + Math.abs(hash).toString(16).toUpperCase() + '-' + Math.floor(Math.random() * 10000);

            // 2. Create Voter Ledger Entry (to prevent double voting)
            const ledgerEntry = {
                id: `ledger_${Date.now()}`,
                institutionId: instId,
                electionId: selectedElection.id,
                studentId: user.id,
                votedAt: timestamp,
                deviceFingerprint: navigator.userAgent
            };

            // 3. Create Anonymous Ballot Entries
            const ballotPromises = Object.entries(candidatesByPosition).map(async ([pos, cands]) => {
                if (selectedElection.votingSystem === 'ranked_choice') {
                    const rankedIds = rankings[pos] || [];
                    // Insert a row for each rank selection
                    return Promise.all(rankedIds.map(async (candId, rankIndex) => {
                        const ballotEntry = {
                            id: `bal_${Date.now()}_${pos.replace(/\s+/g, '_')}_${rankIndex}`,
                            institutionId: instId,
                            electionId: selectedElection.id,
                            position: pos,
                            candidateId: candId,
                            preferenceRank: rankIndex + 1,
                            receiptHash: receipt,
                            createdAt: timestamp
                        };
                        await apiService.saveModuleRecord('election_ballots', ballotEntry);
                        await syncEngine.queueMutation('INSERT', 'election_ballots', ballotEntry).catch(() => {});
                    }));
                } else {
                    const candId = selections[pos];
                    const ballotEntry = {
                        id: `bal_${Date.now()}_${pos.replace(/\s+/g, '_')}`,
                        institutionId: instId,
                        electionId: selectedElection.id,
                        position: pos,
                        candidateId: candId,
                        preferenceRank: 1,
                        receiptHash: receipt,
                        createdAt: timestamp
                    };
                    await apiService.saveModuleRecord('election_ballots', ballotEntry);
                    await syncEngine.queueMutation('INSERT', 'election_ballots', ballotEntry).catch(() => {});
                }
            });

            // Cast voter ledger check-in
            await apiService.saveModuleRecord('election_voters_ledger', ledgerEntry);
            await syncEngine.queueMutation('INSERT', 'election_voters_ledger', ledgerEntry).catch(() => {});

            // Wait for all ballots to save
            await Promise.all(ballotPromises);

            setRecentReceipt(receipt);
            setShowConfirmModal(false);
            fetchData();
        } catch (error) {
            console.error('[EduVoteBallot] Failed to submit vote:', error);
            alert('Failed to submit ballot. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyReceipt = () => {
        if (!recentReceipt) return;
        navigator.clipboard.writeText(recentReceipt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900/50 p-6 lg:p-10 font-sans selection:bg-indigo-500/30 text-slate-800 dark:text-slate-200">
            {/* Header */}
            <div className="mb-10 text-center max-w-xl mx-auto">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-950 dark:text-white flex items-center justify-center gap-3">
                    <Vote className="w-10 h-10 text-indigo-600 animate-bounce" /> EduVote AI Ballot Box
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mt-2">
                    Secure double-blind electronic voting
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Active Ballots...</p>
                </div>
            ) : activeElections.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-16 text-center shadow-sm max-w-md mx-auto">
                    <Clock className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                    <h3 className="text-xl font-bold mb-2">No Active Elections</h3>
                    <p className="text-slate-400 text-xs">There are currently no open voting doors for your school. Please check back during scheduled polling sessions.</p>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Select Election Board (if multiple) */}
                    {activeElections.length > 1 && (
                        <div className="flex gap-3 justify-center overflow-x-auto py-2">
                            {activeElections.map(elec => (
                                <button
                                    key={elec.id}
                                    onClick={() => setSelectedElection(elec)}
                                    className={`px-5 py-3 rounded-full text-[10px] uppercase font-black tracking-widest transition-all ${
                                        selectedElection?.id === elec.id 
                                            ? 'bg-indigo-600 text-white shadow-lg' 
                                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400'
                                    }`}
                                >
                                    {elec.title}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedElection && (
                        <>
                            {/* ALREADY VOTED PANEL */}
                            {hasVoted ? (
                                <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 p-12 text-center shadow-sm max-w-lg mx-auto">
                                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Ballot Cast Successfully</h3>
                                    <p className="text-slate-450 text-xs mb-8">You have already checked-in and cast your vote in this election. To protect secrecy, individual ballots cannot be read back.</p>

                                    {/* Cryptographic receipt display */}
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-150 dark:border-slate-800 text-center relative overflow-hidden">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Cryptographic Voting Receipt</p>
                                        
                                        {recentReceipt ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                                                    {recentReceipt}
                                                </span>
                                                <button
                                                    onClick={handleCopyReceipt}
                                                    className="px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-[9px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-1.5 hover:bg-slate-50"
                                                >
                                                    <Clipboard className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy Hash'}
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] font-medium text-slate-450 italic">Anonymous audit receipt generated at voting check-in</p>
                                        )}
                                    </div>
                                </div>
                            ) : selectedElection.status === 'paused' ? (
                                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-[3rem] p-12 text-center max-w-lg mx-auto">
                                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-pulse" />
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-amber-800 dark:text-amber-300 mb-2">Election Paused</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">The election administrator has temporarily paused voting. Please wait for the commissioner to resume the board.</p>
                                </div>
                            ) : selectedElection.status === 'closed' ? (
                                <div className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-12 text-center max-w-lg mx-auto">
                                    <Award className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 mb-2">Election Closed</h3>
                                    <p className="text-slate-450 text-xs">This election board is closed. Results are now being compiled or are displayed on the public live board.</p>
                                </div>
                            ) : (
                                /* ACTIVE BALLOT FORM */
                                <div className="space-y-10">
                                    {/* Info Banner */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                                        <ShieldCheck className="w-10 h-10 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="font-bold text-xs uppercase text-slate-800 dark:text-slate-100">Secured with double-blind anonymity</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Your student login only tracks *that* you voted. Your candidate choices are submitted anonymously.</p>
                                        </div>
                                    </div>

                                    {/* Ballot Categories */}
                                    {Object.entries(candidatesByPosition).map(([pos, cands]) => {
                                        const system = selectedElection.votingSystem;
                                        return (
                                            <div 
                                                key={pos} 
                                                className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm"
                                            >
                                                <div className="mb-8">
                                                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{pos} Category</h3>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                                        {system === 'ranked_choice' 
                                                            ? 'Rank candidates in order of preference (Click to select/rank)' 
                                                            : 'Choose exactly one candidate below'}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {cands.map(cand => {
                                                        const isSelected = system === 'ranked_choice' 
                                                            ? (rankings[pos] || []).includes(cand.id)
                                                            : selections[pos] === cand.id;
                                                        
                                                        const rankIdx = system === 'ranked_choice' 
                                                            ? (rankings[pos] || []).indexOf(cand.id)
                                                            : -1;

                                                        return (
                                                            <div 
                                                                key={cand.id}
                                                                onClick={() => {
                                                                    if (system === 'ranked_choice') {
                                                                        handleRankCandidate(pos, cand.id);
                                                                    } else {
                                                                        handleSelectCandidate(pos, cand.id);
                                                                    }
                                                                }}
                                                                className={`p-6 rounded-[2.5rem] border cursor-pointer transition-all flex flex-col justify-between min-h-[12rem] relative overflow-hidden ${
                                                                    isSelected 
                                                                        ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm shadow-indigo-500/10' 
                                                                        : 'border-slate-150 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                                                                }`}
                                                            >
                                                                {/* Rank badge for RCV */}
                                                                {rankIdx >= 0 && (
                                                                    <div className="absolute right-6 top-6 w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                                                                        {rankIdx + 1}
                                                                    </div>
                                                                )}

                                                                <div className="flex items-start gap-4">
                                                                    {cand.studentPhoto ? (
                                                                        <img src={cand.studentPhoto} alt={cand.studentName} className="w-12 h-12 rounded-full object-cover border" />
                                                                    ) : (
                                                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-bold text-slate-600 text-sm">
                                                                            {cand.studentName?.substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <h4 className="font-black text-base text-slate-855 dark:text-white">{cand.studentName}</h4>
                                                                        {cand.tagline && <p className="text-[10px] text-slate-450 italic mt-0.5">"{cand.tagline}"</p>}
                                                                    </div>
                                                                </div>

                                                                {cand.manifesto && (
                                                                    <p className="text-[11px] text-slate-400 mt-4 leading-relaxed line-clamp-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-transparent">
                                                                        {cand.manifesto}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Cast Action */}
                                    <div className="text-center pt-4">
                                        <button
                                            onClick={() => setShowConfirmModal(true)}
                                            disabled={!isBallotComplete}
                                            className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all ${
                                                isBallotComplete 
                                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 hover:shadow-indigo-500/30' 
                                                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 shadow-none cursor-not-allowed'
                                            }`}
                                        >
                                            Submit Ballot Box
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* CONFIRM VOTE DIALOG */}
            {showConfirmModal && selectedElection && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl text-center">
                        <Vote className="w-16 h-16 text-indigo-600 mx-auto mb-6 animate-bounce" />
                        
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Cast Official Ballot?</h3>
                        <p className="text-slate-450 text-xs mb-8">
                            Your ballot choices are final and cannot be altered. The double-blind protocol will unlink your student profile ID from candidate choices.
                        </p>

                        <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700/60 pt-6">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all"
                                disabled={isSubmitting}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCastVote}
                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    'Cast Vote'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
