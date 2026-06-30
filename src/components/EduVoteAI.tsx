import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Plus, Trash, Play, Pause, Square, CheckCircle, XCircle, QrCode, 
    ChevronRight, BarChart2, Award, Calendar, Layers, ShieldCheck, 
    FileText, UserCheck, AlertTriangle
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { localDb } from '../services/localDb';
import { syncEngine } from '../services/syncEngine';
import { generateStudentVotersCardsPdf } from '../services/pdfService';
import type { User, ElectionEvent, ElectionCandidate } from '../types';

interface EduVoteAIProps {
    user: User;
    onViewProjector?: (electionId: string) => void;
}

export const EduVoteAI: React.FC<EduVoteAIProps> = ({ user, onViewProjector }) => {
    const [elections, setElections] = useState<ElectionEvent[]>([]);
    const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [title, setTitle] = useState('');
    const [votingSystem, setVotingSystem] = useState<'fptp' | 'ranked_choice'>('fptp');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    
    // Nomination Modal States
    const [selectedElection, setSelectedElection] = useState<ElectionEvent | null>(null);
    const [showNominateModal, setShowNominateModal] = useState(false);
    const [nomineeId, setNomineeId] = useState('');
    const [position, setPosition] = useState('');
    const [tagline, setTagline] = useState('');
    const [manifesto, setManifesto] = useState('');

    // QR Codes state
    const [generatedPasscodes, setGeneratedPasscodes] = useState<string[]>([]);
    const [showPasscodeModal, setShowPasscodeModal] = useState(false);
    const [passcodeQty, setPasscodeQty] = useState(10);
    const [generatingCards, setGeneratingCards] = useState<string | null>(null);

    // Fetch Initial Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const instId = user.institutionId || 'GLOBAL';
            
            // Fetch events, candidates, and users for the tenant
            const [eventsData, candData, usersData] = await Promise.all([
                apiService.fetchModuleRecords('election_events', instId).catch(() => []),
                apiService.fetchModuleRecords('election_candidates', instId).catch(() => []),
                apiService.fetchModuleRecords('users', instId).catch(() => [])
            ]);

            setElections(eventsData || []);
            setCandidates(candData || []);
            
            // Only keep students in nominee list
            const studentUsers = (usersData || []).filter((u: any) => u.role === 'student');
            setStudents(studentUsers);
        } catch (error) {
            console.error('[EduVoteAI] Error loading election records:', error);
        } finally {
            setLoading(false);
        }
    }, [user.institutionId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Create Election
    const handleCreateElection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !startTime || !endTime) return;

        const newElection: ElectionEvent = {
            id: `elec_${Date.now()}`,
            institutionId: user.institutionId || 'GLOBAL',
            title,
            status: 'draft',
            votingSystem,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('election_events', newElection);
            await syncEngine.queueMutation('INSERT', 'election_events', newElection).catch(() => {});
            setShowCreateModal(false);
            // Reset fields
            setTitle('');
            setVotingSystem('fptp');
            setStartTime('');
            setEndTime('');
            fetchData();
        } catch (error) {
            console.error('[EduVoteAI] Failed to create election:', error);
        }
    };

    // Update Election Status
    const handleUpdateStatus = async (election: ElectionEvent, newStatus: ElectionEvent['status']) => {
        const updated: ElectionEvent = {
            ...election,
            status: newStatus
        };

        try {
            await apiService.saveModuleRecord('election_events', updated);
            await syncEngine.queueMutation('UPDATE', 'election_events', updated).catch(() => {});
            fetchData();
        } catch (error) {
            console.error('[EduVoteAI] Failed to update status:', error);
        }
    };

    // Submit Nomination
    const handleNominateCandidate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedElection || !nomineeId || !position) return;

        const newCand: ElectionCandidate = {
            id: `cand_${Date.now()}`,
            institutionId: user.institutionId || 'GLOBAL',
            electionId: selectedElection.id,
            studentId: nomineeId,
            position,
            tagline,
            manifesto,
            status: 'approved',
            createdAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('election_candidates', newCand);
            await syncEngine.queueMutation('INSERT', 'election_candidates', newCand).catch(() => {});
            setShowNominateModal(false);
            setNomineeId('');
            setPosition('');
            setTagline('');
            setManifesto('');
            fetchData();
        } catch (error) {
            console.error('[EduVoteAI] Failed to nominate candidate:', error);
        }
    };

    // Delete Nomination
    const handleDeleteNomination = async (candId: string) => {
        if (!window.confirm('Are you sure you want to remove this candidate?')) return;
        try {
            await apiService.deleteModuleRecord('election_candidates', candId);
            await syncEngine.queueMutation('DELETE', 'election_candidates', { id: candId }).catch(() => {});
            fetchData();
        } catch (error) {
            console.error('[EduVoteAI] Failed to delete nominee:', error);
        }
    };

    // Moderate/Update Nominee status
    const handleModeration = async (candidate: ElectionCandidate, newStatus: ElectionCandidate['status']) => {
        const updated = { ...candidate, status: newStatus };
        try {
            await apiService.saveModuleRecord('election_candidates', updated);
            await syncEngine.queueMutation('UPDATE', 'election_candidates', updated).catch(() => {});
            fetchData();
        } catch (error) {
            console.error('[EduVoteAI] Moderation update failed:', error);
        }
    };

    // Generate single-use passcodes for kiosk mode
    const handleGeneratePasscodes = () => {
        const codes = Array.from({ length: passcodeQty }, () => {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const numbers = '0123456789';
            let code = '';
            for (let i = 0; i < 4; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
            code += '-';
            for (let i = 0; i < 4; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
            return code;
        });
        setGeneratedPasscodes(codes);
        setShowPasscodeModal(true);
    };

    const handlePrintVoterPasses = async (election: ElectionEvent) => {
        setGeneratingCards(election.id);
        try {
            const instId = user.institutionId || 'GLOBAL';
            const instData = await apiService.fetchModuleRecord('institutions', instId).catch(() => null);
            const institution = instData || { name: 'My School' };

            // Fetch active branding logo if any
            const logoUrl = institution.logoUrl || institution.logo_url || '';

            const pdfDataUri = await generateStudentVotersCardsPdf(election, students, institution, logoUrl);

            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = `Voter_Passes_${election.title.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('[EduVoteAI] Failed to generate voter cards:', error);
            alert('Failed to generate voter cards. Please verify that QRCode library is loaded.');
        } finally {
            setGeneratingCards(null);
        }
    };

    // Map candidate names using users database list
    const candidatesWithProfiles = useMemo(() => {
        return candidates.map(c => {
            const profile = students.find(s => s.id === c.studentId);
            return {
                ...c,
                studentName: profile?.name || 'Unknown Student',
                studentPhoto: (profile as any)?.photoUrl || (profile as any)?.photo || null
            };
        });
    }, [candidates, students]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900/50 p-6 lg:p-10 font-sans selection:bg-indigo-500/30 text-slate-800 dark:text-slate-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-950 dark:text-white flex items-center gap-4">
                        <Award className="w-12 h-12 text-indigo-600 animate-pulse" /> EduVote AI
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">
                        Official Academic Election Control Hub
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={handleGeneratePasscodes}
                        className="px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all"
                    >
                        <QrCode className="w-4 h-4 text-indigo-500" /> Kiosk Passcodes
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Create Election
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Ballot Boxes...</p>
                </div>
            ) : elections.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-16 text-center shadow-sm max-w-xl mx-auto">
                    <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-2">No Active Elections</h3>
                    <p className="text-slate-400 text-xs mb-8">Ready to automate your school captain or class representative voting? Initialize your first secure election event above.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-4 bg-indigo-600 text-white rounded-3xl text-[10px] uppercase tracking-widest font-black"
                    >
                        Launch First Board
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Elections List */}
                    <div className="xl:col-span-2 space-y-8">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Electoral Boards</h2>
                        {elections.map(election => {
                            const cands = candidatesWithProfiles.filter(c => c.electionId === election.id);
                            return (
                                <div 
                                    key={election.id} 
                                    className="bg-white dark:bg-slate-800 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                                >
                                    {/* Left Accent Color Indicator */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${
                                        election.status === 'active' ? 'bg-emerald-500' :
                                        election.status === 'closed' ? 'bg-slate-400' :
                                        election.status === 'paused' ? 'bg-amber-500' : 'bg-indigo-600'
                                    }`} />

                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pl-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                    election.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' :
                                                    election.status === 'closed' ? 'bg-slate-105 text-slate-550 dark:bg-slate-900/30' :
                                                    'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30'
                                                }`}>
                                                    {election.status}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Layers className="w-3 h-3 text-indigo-400" /> {election.votingSystem === 'ranked_choice' ? 'Ranked-Choice' : 'FPTP / Classic'}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight mt-3 text-slate-900 dark:text-white">
                                                {election.title}
                                            </h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(election.startTime).toLocaleDateString()} - {new Date(election.endTime).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2.5">
                                            {/* Live board projector */}
                                            {onViewProjector && (
                                                <button
                                                    onClick={() => onViewProjector(election.id)}
                                                    className="p-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950 text-indigo-600 rounded-2xl transition-all"
                                                    title="Projector Dashboard"
                                                >
                                                    <BarChart2 className="w-5 h-5" />
                                                </button>
                                            )}

                                            {/* Print Voter Passes */}
                                            <button
                                                onClick={() => handlePrintVoterPasses(election)}
                                                className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-all flex items-center justify-center"
                                                title="Print Voter Passes"
                                                disabled={generatingCards === election.id}
                                            >
                                                {generatingCards === election.id ? (
                                                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <FileText className="w-5 h-5" />
                                                )}
                                            </button>

                                            {/* Status Switchers */}
                                            {election.status === 'draft' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(election, 'active')}
                                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-current" /> Start Voting
                                                </button>
                                            )}

                                            {election.status === 'active' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(election, 'paused')}
                                                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                                    >
                                                        <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(election, 'closed')}
                                                        className="px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                                    >
                                                        <Square className="w-3.5 h-3.5 fill-current" /> Close Box
                                                    </button>
                                                </>
                                            )}

                                            {election.status === 'paused' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(election, 'active')}
                                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Candidates list inside election board */}
                                    <div className="border-t border-slate-100 dark:border-slate-700/60 pt-6 pl-4">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Approved Nominees ({cands.length})</h4>
                                            {election.status === 'draft' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedElection(election);
                                                        setShowNominateModal(true);
                                                    }}
                                                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline flex items-center gap-1"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Nominate Candidate
                                                </button>
                                            )}
                                        </div>

                                        {cands.length === 0 ? (
                                            <p className="text-slate-400 text-xs italic">No candidates nominated yet.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {cands.map(cand => (
                                                    <div 
                                                        key={cand.id} 
                                                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {cand.studentPhoto ? (
                                                                <img src={cand.studentPhoto} alt={cand.studentName} className="w-10 h-10 rounded-full object-cover border border-slate-205" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-xs">
                                                                    {cand.studentName?.substring(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{cand.studentName}</p>
                                                                <p className="text-[9px] font-black uppercase text-indigo-600 tracking-wider mt-0.5">{cand.position}</p>
                                                                {cand.tagline && <p className="text-[10px] text-slate-400 italic mt-0.5">"{cand.tagline}"</p>}
                                                            </div>
                                                        </div>

                                                        {election.status === 'draft' && (
                                                            <button 
                                                                onClick={() => handleDeleteNomination(cand.id)}
                                                                className="text-slate-400 hover:text-rose-600 p-2 transition-colors"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Stats Panel / Activity */}
                    <div className="space-y-8">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Audit & Security</h2>
                        
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-tight">Encryption Registry</h3>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Live double-blind protocol</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[10px] space-y-2 border border-slate-100 dark:border-slate-800">
                                <p className="font-bold uppercase tracking-wider text-slate-400">Protocol Settings:</p>
                                <ul className="space-y-1.5 text-slate-400 pl-2 list-disc">
                                    <li>Independent checks via <code>election_voters_ledger</code></li>
                                    <li>Cryptographic SHA-256 ballot checksum matching enabled</li>
                                    <li>Strict 1 ballot limit per student category enforced</li>
                                </ul>
                            </div>

                            <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-700/60 pt-4">
                                <span className="font-medium text-slate-400">Active Students:</span>
                                <span className="font-bold">{students.length} Registered</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE ELECTION MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl relative">
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-8">Setup Election Board</h3>
                        <form onSubmit={handleCreateElection} className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Election Title</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Student Council Elections 2026"
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-3xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Voting System</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setVotingSystem('fptp')}
                                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${votingSystem === 'fptp' ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <Award className="w-5 h-5 text-indigo-500" />
                                        <div>
                                            <p className="font-black text-[10px] uppercase tracking-wide">First Past The Post</p>
                                            <p className="text-[9px] text-slate-400 mt-1">Simple majority winner</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVotingSystem('ranked_choice')}
                                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${votingSystem === 'ranked_choice' ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <Layers className="w-5 h-5 text-indigo-500" />
                                        <div>
                                            <p className="font-black text-[10px] uppercase tracking-wide">Ranked-Choice</p>
                                            <p className="text-[9px] text-slate-400 mt-1">Redistributes runner-up votes</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Voting Start</label>
                                    <input 
                                        type="datetime-local" 
                                        value={startTime} 
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500" 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Voting End</label>
                                    <input 
                                        type="datetime-local" 
                                        value={endTime} 
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500" 
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700/60 pt-6 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all"
                                >
                                    Initialize
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* NOMINATE CANDIDATE MODAL */}
            {showNominateModal && selectedElection && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl">
                        <h3 className="text-2xl font-black uppercase tracking-tight mb-8">Nominate Candidate</h3>
                        <form onSubmit={handleNominateCandidate} className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Select Student</label>
                                <select 
                                    value={nomineeId} 
                                    onChange={(e) => setNomineeId(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-3xl text-sm focus:outline-none"
                                    required
                                >
                                    <option value="">-- Choose Candidate --</option>
                                    {students.map(std => (
                                        <option key={std.id} value={std.id}>{std.name || std.email}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Contested Position</label>
                                <input 
                                    type="text" 
                                    value={position} 
                                    onChange={(e) => setPosition(e.target.value)}
                                    placeholder="e.g. School Captain, Dorm Captain"
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-3xl text-sm focus:outline-none" 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Campaign Tagline</label>
                                <input 
                                    type="text" 
                                    value={tagline} 
                                    onChange={(e) => setTagline(e.target.value)}
                                    placeholder="e.g. Forward together, a voice for all."
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-3xl text-sm focus:outline-none" 
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Candidate Manifesto</label>
                                <textarea 
                                    value={manifesto} 
                                    onChange={(e) => setManifesto(e.target.value)}
                                    placeholder="Outline the core campaign plans..."
                                    rows={4}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-3xl text-sm focus:outline-none resize-none" 
                                />
                            </div>

                            <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700/60 pt-6 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowNominateModal(false)}
                                    className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all"
                                >
                                    Nominate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* GENERATED PASSCODES MODAL */}
            {showPasscodeModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Kiosk Voting Tokens</h3>
                            <button 
                                onClick={() => setShowPasscodeModal(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                Close
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mb-6">Distribute these single-use codes to students to allow authentication on standard voting booths/tablets.</p>
                        
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            {generatedPasscodes.map((code, idx) => (
                                <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="font-mono font-bold text-sm tracking-widest text-indigo-600 dark:text-indigo-400">{code}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 mt-8 border-t border-slate-100 dark:border-slate-700/60 pt-6">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qty:</label>
                                <input 
                                    type="number" 
                                    value={passcodeQty} 
                                    onChange={(e) => setPasscodeQty(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-center text-xs font-bold focus:outline-none" 
                                />
                            </div>
                            <button
                                onClick={handleGeneratePasscodes}
                                className="flex-1 py-3 bg-indigo-600 text-white text-[10px] uppercase tracking-widest font-black rounded-3xl"
                            >
                                Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
