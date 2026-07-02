import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    const [courses, setCourses] = useState<any[]>([]);
    const [courseLevels, setCourseLevels] = useState<any[]>([]);
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
    const [posterUrl, setPosterUrl] = useState('');
    const [uploadingPoster, setUploadingPoster] = useState(false);

    // QR Codes state
    const [generatedPasscodes, setGeneratedPasscodes] = useState<string[]>([]);
    const [showPasscodeModal, setShowPasscodeModal] = useState(false);
    const [passcodeQty, setPasscodeQty] = useState(10);
    const [generatingCards, setGeneratingCards] = useState<string | null>(null);

    // Voters Card Print & Preview Modal States
    const [showPrintModal, setShowPrintModal] = useState<ElectionEvent | null>(null);
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedStream, setSelectedStream] = useState<string>('');
    const [selectedVoters, setSelectedVoters] = useState<Set<string>>(new Set());
    const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

    // Voter Check-In & Scanner States
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [scannerSelectedElectionId, setScannerSelectedElectionId] = useState('');
    const [scannerMatchedStudent, setScannerMatchedStudent] = useState<User | null>(null);
    const [scannerInput, setScannerInput] = useState('');
    const [voterLedger, setVoterLedger] = useState<any[]>([]);
    const [electionCheckins, setElectionCheckins] = useState<any[]>([]);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Fetch Initial Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const instId = user.institutionId || 'GLOBAL';
            
            // Fetch events, candidates, users, courses, and levels for the tenant
            const [eventsData, candData, usersData, coursesData, levelsData, ledgerData, checkinsData] = await Promise.all([
                apiService.fetchModuleRecords('election_events', instId).catch(() => []),
                apiService.fetchModuleRecords('election_candidates', instId).catch(() => []),
                apiService.fetchModuleRecords('users', instId).catch(() => []),
                apiService.fetchModuleRecords('courses', instId).catch(() => []),
                apiService.fetchModuleRecords('course_levels', instId).catch(() => []),
                apiService.fetchModuleRecords('election_voters_ledger', instId).catch(() => []),
                apiService.fetchModuleRecords('election_checkins', instId).catch(() => [])
            ]);

            setElections(eventsData || []);
            setCandidates(candData || []);
            setCourses(coursesData || []);
            setCourseLevels(levelsData || []);
            setVoterLedger(ledgerData || []);
            setElectionCheckins(checkinsData || []);
            
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

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera access failed:", err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleSelectVoter = (student: User) => {
        setScannerMatchedStudent(student);
    };

    const handleUrlInput = (urlStr: string) => {
        try {
            const url = new URL(urlStr);
            const email = url.searchParams.get('email');
            if (email) {
                const std = students.find(s => s.email?.toLowerCase() === email.toLowerCase());
                if (std) {
                    handleSelectVoter(std);
                    return;
                }
            }
        } catch (e) {
            const std = students.find(s => s.id === urlStr || s.email?.toLowerCase() === urlStr.toLowerCase() || s.name?.toLowerCase().includes(urlStr.toLowerCase()));
            if (std) {
                handleSelectVoter(std);
                return;
            }
        }
        alert("No matching registered voter was found for that input.");
    };

    const handleMarkCheckedIn = async () => {
        if (!scannerSelectedElectionId || !scannerMatchedStudent) return;
        const newCheckin = {
            id: `chk_${Date.now()}`,
            electionId: scannerSelectedElectionId,
            studentId: scannerMatchedStudent.id,
            checkedInAt: new Date().toISOString(),
            institutionId: user.institutionId || 'GLOBAL'
        };

        try {
            await apiService.saveModuleRecord('election_checkins', newCheckin);
            await syncEngine.queueMutation('INSERT', 'election_checkins', newCheckin).catch(() => {});
            setElectionCheckins(prev => [...prev, newCheckin]);
            alert(`Checked in ${scannerMatchedStudent.name} successfully! Ballot activated.`);
            setScannerMatchedStudent(null);
            setScannerInput('');
            fetchData();
        } catch (error) {
            console.error("Voter check-in failed:", error);
            alert("Voter check-in failed.");
        }
    };

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

    const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPoster(true);
        try {
            const fileName = `campaigns/cand_${nomineeId || 'temp'}_${Date.now()}.${file.name.split('.').pop()}`;
            const publicUrl = await apiService.uploadFile('eduai', fileName, file, file.type);
            if (publicUrl) {
                setPosterUrl(publicUrl);
            }
        } catch (err) {
            console.error("Poster upload failed:", err);
            alert("Failed to upload campaign photo.");
        } finally {
            setUploadingPoster(false);
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
            posterUrl: posterUrl || undefined,
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
            setPosterUrl('');
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

    const handlePrintVoterPasses = (election: ElectionEvent) => {
        setShowPrintModal(election);
        setSelectedGrade('');
        setSelectedStream('');
    };

    // Filtered voters for card preview
    const filteredVoters = useMemo(() => {
        if (!showPrintModal) return [];
        return students.filter(std => {
            const matchesGrade = !selectedGrade || std.courseId === selectedGrade;
            const matchesStream = !selectedStream || std.courseLevelId === selectedStream;
            return matchesGrade && matchesStream;
        });
    }, [showPrintModal, students, selectedGrade, selectedStream]);

    // Update selected voters set automatically when filtered list changes
    useEffect(() => {
        if (showPrintModal) {
            setSelectedVoters(new Set(filteredVoters.map(v => v.id)));
        }
    }, [filteredVoters, showPrintModal]);

    // Pre-generate QR codes sequentially for filtered voters when they change
    useEffect(() => {
        let isCurrent = true;
        
        const generateQrs = async () => {
            if (!showPrintModal || filteredVoters.length === 0) return;
            const urls: Record<string, string> = {};
            
            for (const voter of filteredVoters) {
                if (!isCurrent) break;
                if (qrUrls[voter.id]) {
                    urls[voter.id] = qrUrls[voter.id];
                    continue;
                }
                
                const voterLoginUrl = `${window.location.origin}/?email=${encodeURIComponent(voter.email || '')}&view=student&tab=eduvote`;
                if (typeof window !== 'undefined' && (window as any).QRCode) {
                    try {
                        const url = await (window as any).QRCode.toDataURL(voterLoginUrl, { margin: 1, width: 120 });
                        urls[voter.id] = url;
                    } catch (e) {
                        console.warn("QR pre-generation failed for voter card", e);
                    }
                }
            }
            if (isCurrent) {
                setQrUrls(prev => ({ ...prev, ...urls }));
            }
        };

        generateQrs();

        return () => {
            isCurrent = false;
        };
    }, [filteredVoters, showPrintModal]);

    const handleDownloadVoterPasses = async () => {
        if (!showPrintModal) return;
        const election = showPrintModal;
        
        // Filter students list to only include selected voters
        const targetVoters = filteredVoters.filter(v => selectedVoters.has(v.id));
        if (targetVoters.length === 0) {
            alert("Please select at least one voter to print passes.");
            return;
        }

        setGeneratingCards(election.id);
        try {
            const instId = user.institutionId || 'GLOBAL';
            const instData = await apiService.fetchModuleRecord('institutions', instId).catch(() => null);
            const institution = instData || { name: 'My School' };

            // Fetch active branding logo if any
            const logoUrl = institution.logoUrl || institution.logo_url || '';

            const pdfDataUri = await generateStudentVotersCardsPdf(election, targetVoters, institution, logoUrl);

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
                        onClick={() => setShowCheckInModal(true)}
                        className="px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all"
                    >
                        <UserCheck className="w-4 h-4 text-indigo-500" /> Voter Check-In Desk
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

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Campaign Photo / Poster</label>
                                <div className="flex items-center gap-4 p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50">
                                    {posterUrl ? (
                                        <div className="relative group shrink-0">
                                            <img loading="lazy"
                                                src={posterUrl}
                                                alt="Campaign Poster"
                                                className="w-16 h-16 object-cover rounded-2xl border border-slate-200 dark:border-slate-700"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setPosterUrl('')}
                                                className="absolute -top-1.5 -right-1.5 bg-red-505 bg-red-550 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors bg-red-500"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-grow">
                                        <input
                                            type="file"
                                            id="campaign-photo-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handlePosterUpload}
                                        />
                                        <label
                                            htmlFor="campaign-photo-upload"
                                            className="cursor-pointer inline-flex items-center gap-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-2.5 px-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            {uploadingPoster ? (
                                                <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                                </svg>
                                            )}
                                            {uploadingPoster ? 'Uploading...' : 'Upload Photo'}
                                        </label>
                                        <p className="text-[9px] text-slate-400 mt-1.5 uppercase font-bold tracking-tight">Recommended: High Resolution Campaign Portrait, max 3MB</p>
                                    </div>
                                </div>
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

            {/* VOTER PASS PREVIEW & FILTER MODAL */}
            {showPrintModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-5xl h-[85vh] rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col justify-between">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center pb-6 border-b border-slate-100 dark:border-slate-700/60">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Print & Preview Voter Passes</h3>
                                <p className="text-xs text-slate-400 mt-1">Configure filters, preview cards on-screen, and print official voter credentials.</p>
                            </div>
                            <button 
                                onClick={() => setShowPrintModal(null)}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-950 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Close
                            </button>
                        </div>

                        {/* Filters Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 bg-slate-50 dark:bg-slate-900/30 px-6 rounded-3xl mt-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Filter by Grade/Course</label>
                                <select 
                                    value={selectedGrade} 
                                    onChange={(e) => {
                                        setSelectedGrade(e.target.value);
                                        setSelectedStream('');
                                    }}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none"
                                >
                                    <option value="">All Grades / Courses</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Filter by Stream/Level</label>
                                <select 
                                    value={selectedStream} 
                                    onChange={(e) => setSelectedStream(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none"
                                    disabled={!selectedGrade}
                                >
                                    <option value="">All Streams</option>
                                    {courseLevels
                                        .filter(l => l.courseId === selectedGrade)
                                        .map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                            <div className="flex items-end justify-between md:justify-end gap-3 h-full pb-1">
                                <button
                                    onClick={() => setSelectedVoters(new Set(filteredVoters.map(v => v.id)))}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => setSelectedVoters(new Set())}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Deselect All
                                </button>
                            </div>
                        </div>

                        {/* Cards Preview Grid */}
                        <div className="flex-1 overflow-y-auto my-6 pr-2">
                            {filteredVoters.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/10 rounded-[2.5rem] border border-dashed">
                                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                                    <p className="text-slate-400 text-xs italic">No registered student voters found matching the active filters.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                                    {filteredVoters.map(voter => {
                                        const isChecked = selectedVoters.has(voter.id);
                                        const regNo = voter.admissionNumber || voter.admission_number || voter.staffId || voter.id.substring(0, 8);
                                        const instData = localDb.getInstitution?.(user.institutionId || 'GLOBAL') || {};
                                        
                                        return (
                                            <div 
                                                key={voter.id}
                                                onClick={() => {
                                                    setSelectedVoters(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(voter.id)) next.delete(voter.id);
                                                        else next.add(voter.id);
                                                        return next;
                                                    });
                                                }}
                                                className={`relative rounded-3xl border-2 transition-all cursor-pointer overflow-hidden bg-white dark:bg-slate-800 flex flex-col justify-between h-[180px] shadow-sm select-none ${
                                                    isChecked 
                                                        ? 'border-indigo-600 bg-indigo-50/5 dark:bg-indigo-950/5 shadow-md shadow-indigo-500/5' 
                                                        : 'border-slate-150 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                {/* Card Header */}
                                                <div className="bg-indigo-600 text-white px-5 py-2.5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Award className="w-4 h-4 text-white animate-pulse" />
                                                        <div>
                                                            <div className="text-[7.5px] font-black uppercase tracking-wider">{instData.name || 'Institution'}</div>
                                                            <div className="text-[5px] opacity-80 uppercase tracking-widest font-black">Official Voter Pass</div>
                                                        </div>
                                                    </div>
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}} // handled by div click
                                                        className="w-4 h-4 rounded border-indigo-400 text-indigo-600 focus:ring-0 cursor-pointer pointer-events-none"
                                                    />
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-4 flex justify-between items-center h-full gap-4">
                                                    <div className="space-y-1.5 text-left max-w-[170px] overflow-hidden">
                                                        <div className="text-[6.5px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider truncate">
                                                            Election: {showPrintModal.title}
                                                        </div>
                                                        <div className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight truncate">
                                                            {voter.name || 'Unknown Voter'}
                                                        </div>
                                                        <div>
                                                            <div className="text-[5px] text-slate-400 font-black uppercase tracking-wider">Voter Reg No.</div>
                                                            <div className="text-[8px] font-bold text-slate-800 dark:text-slate-200">{regNo}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[5px] text-slate-400 font-black uppercase tracking-wider">Voter Email / ID</div>
                                                            <div className="text-[8px] font-bold text-slate-850 dark:text-slate-200 truncate max-w-[150px]">{voter.email}</div>
                                                        </div>
                                                    </div>

                                                    {/* Right QR */}
                                                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                                                        {qrUrls[voter.id] ? (
                                                            <img src={qrUrls[voter.id]} alt="Voter QR" className="w-[60px] h-[60px] border border-slate-100 rounded p-0.5 bg-white shrink-0" />
                                                        ) : (
                                                            <div className="w-[60px] h-[60px] bg-slate-100 dark:bg-slate-900 animate-pulse rounded border shrink-0" />
                                                        )}
                                                        <span className="text-[5.5px] font-black text-slate-400 uppercase tracking-widest">Scan to Vote</span>
                                                    </div>
                                                </div>

                                                {/* Card Footer */}
                                                <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-1.5 text-center border-t border-slate-150/50 dark:border-slate-700/50">
                                                    <span className="text-[5.5px] font-black text-slate-400 uppercase tracking-widest">Double-Blind Cryptographic Voting Pass</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-700/60 mt-auto">
                            <span className="text-xs font-bold text-slate-400">
                                Selected: <span className="text-indigo-600 font-black">{selectedVoters.size}</span> of {filteredVoters.length} matching students
                            </span>
                            <div className="flex gap-4 w-full sm:w-auto">
                                <button
                                    onClick={() => setShowPrintModal(null)}
                                    className="flex-1 sm:flex-none px-6 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDownloadVoterPasses}
                                    disabled={generatingCards === showPrintModal.id || selectedVoters.size === 0}
                                    className="flex-1 sm:flex-none px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    {generatingCards === showPrintModal.id ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Compiling passes...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-4 h-4" />
                                            Download PDF Passes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VOTER CHECK-IN SCANNER MODAL */}
            {showCheckInModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Voter Check-In Desk</h3>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Live Electoral Registry Verification</p>
                            </div>
                            <button 
                                onClick={() => {
                                    stopCamera();
                                    setShowCheckInModal(false);
                                    setScannerMatchedStudent(null);
                                    setScannerInput('');
                                }} 
                                className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 rounded-full transition-colors"
                            >
                                <XCircle className="w-6 h-6 text-slate-500 hover:text-red-500" />
                            </button>
                        </div>

                        {/* Scanner Select Election */}
                        <div className="mb-6">
                            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Select Active Election</label>
                            <select
                                value={scannerSelectedElectionId}
                                onChange={(e) => {
                                    setScannerSelectedElectionId(e.target.value);
                                    setScannerMatchedStudent(null);
                                }}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-3xl text-sm focus:outline-none font-bold"
                            >
                                <option value="">-- Choose Election Event --</option>
                                {elections.filter(e => e.status === 'active' || e.status === 'paused').map(e => (
                                    <option key={e.id} value={e.id}>{e.title}</option>
                                ))}
                            </select>
                        </div>

                        {scannerSelectedElectionId ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Side: Camera Scanner View / Simulator */}
                                <div className="space-y-4">
                                    <div className="relative rounded-[2rem] bg-slate-950 border-2 border-slate-800 overflow-hidden aspect-video flex items-center justify-center">
                                        {/* Camera feed */}
                                        <video 
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                            style={{ display: stream ? 'block' : 'none' }}
                                        />
                                        {!stream && (
                                            <div className="text-center p-6 space-y-3">
                                                <QrCode className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
                                                <button
                                                    onClick={startCamera}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Start Video Scanner
                                                </button>
                                                <p className="text-[9px] text-slate-500">Camera feed requires SSL or localhost connection.</p>
                                            </div>
                                        )}
                                        {stream && (
                                            <div className="absolute inset-0 border-[3px] border-emerald-500/60 pointer-events-none rounded-[2rem] m-4 animate-pulse">
                                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500/80 -translate-y-1/2" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Simulated scan option */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-[2rem] space-y-3">
                                        <span className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">Demo / Hardware Scanner Simulator</span>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Paste QR Code URL or type email..."
                                                value={scannerInput}
                                                onChange={(e) => setScannerInput(e.target.value)}
                                                className="flex-grow px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none"
                                            />
                                            <button
                                                onClick={() => handleUrlInput(scannerInput)}
                                                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all"
                                            >
                                                Scan
                                            </button>
                                        </div>
                                        <select
                                            onChange={(e) => {
                                                const std = students.find(s => s.id === e.target.value);
                                                if (std) handleSelectVoter(std);
                                            }}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none"
                                        >
                                            <option value="">-- Or Select Student to Simulate --</option>
                                            {students.map(s => (
                                                <option key={s.id} value={s.id}>{s.name || s.email}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Right Side: Voter Profile Status Card */}
                                <div className="flex flex-col justify-between h-full min-h-[300px]">
                                    {scannerMatchedStudent ? (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 flex-grow flex flex-col justify-between space-y-4">
                                            {/* Photo & Identity details */}
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-indigo-500 shrink-0">
                                                    {(scannerMatchedStudent as any).photoUrl ? (
                                                        <img src={(scannerMatchedStudent as any).photoUrl} alt="Student" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-black text-indigo-400 text-xl">
                                                            {scannerMatchedStudent.name?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">{scannerMatchedStudent.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{scannerMatchedStudent.email}</p>
                                                    <span className="inline-block text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Registered Student</span>
                                                </div>
                                            </div>

                                            {/* Eligibility Details */}
                                            {(() => {
                                                const hasVotedInElec = voterLedger.some(l => l.electionId === scannerSelectedElectionId && l.studentId === scannerMatchedStudent.id);
                                                const hasCheckedIn = electionCheckins.some(c => c.electionId === scannerSelectedElectionId && c.studentId === scannerMatchedStudent.id);

                                                return (
                                                    <div className="space-y-4 flex-grow flex flex-col justify-center text-left">
                                                        {hasVotedInElec ? (
                                                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                                                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">Status: Already Voted</span>
                                                                <p className="text-slate-400 text-[10px] font-bold">This voter has already submitted a ballot. Ballot key is locked.</p>
                                                            </div>
                                                        ) : hasCheckedIn ? (
                                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                                                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">Status: Checked In</span>
                                                                <p className="text-slate-400 text-[10px] font-bold">Already checked in at the check-in desk. Waiting to cast vote.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Status: Eligible to Vote</span>
                                                                <p className="text-slate-400 text-[10px] font-bold">Not checked in yet. Ready to activate ballot.</p>
                                                            </div>
                                                        )}

                                                        {/* Actions */}
                                                        {!hasVotedInElec && !hasCheckedIn && (
                                                            <button
                                                                onClick={handleMarkCheckedIn}
                                                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <CheckCircle className="w-4 h-4" /> Check In & Activate Ballot
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-12 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 flex-grow flex flex-col justify-center items-center text-center">
                                            <QrCode className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Awaiting Registry Scan</p>
                                            <p className="text-slate-400 text-[10px] max-w-[200px] mt-1.5 leading-relaxed">Present student voters card to scanner to load verification credentials.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-450 font-bold uppercase text-xs">
                                Please select an active election event to initialize scanning.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
