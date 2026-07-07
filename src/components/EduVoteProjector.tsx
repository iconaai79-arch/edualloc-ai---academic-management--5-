import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Users, Award, BarChart2, Shield, Calendar, Layers, Clock, AlertCircle, ArrowLeft,
    TrendingUp, Activity, Tv
} from 'lucide-react';
import { apiService } from '../services/apiService';
import type { User, ElectionEvent, ElectionCandidate, ElectionBallot, Course, CourseLevel, ElectionVoterLedger } from '../types';

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

    // Turnout Analytics States
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseLevels, setCourseLevels] = useState<CourseLevel[]>([]);
    const [votersLedger, setVotersLedger] = useState<ElectionVoterLedger[]>([]);
    const [projectorView, setProjectorView] = useState<'overview' | 'turnout'>('overview');

    // Mask/Reveal States
    const [isMasked, setIsMasked] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

    // Fetch Election Data and Votes
    const fetchData = useCallback(async () => {
        try {
            // First fetch election details to get institutionId
            const elecData = await apiService.fetchModuleRecords('election_events').then(list => (list || []).find((e: any) => e.id === electionId));
            
            if (elecData) {
                const instId = elecData.institutionId;
                
                // Fetch candidate data, ballots, users, courses, course levels, and voter ledger
                const [candData, ballotsData, usersData, coursesData, levelsData, ledgerData] = await Promise.all([
                    apiService.fetchModuleRecords('election_candidates', instId).then(list => (list || []).filter((c: any) => c.electionId === electionId && c.status === 'approved')),
                    apiService.fetchModuleRecords('election_ballots', instId).then(list => (list || []).filter((b: any) => b.electionId === electionId)),
                    apiService.fetchModuleRecords('users', instId).catch(() => []),
                    apiService.fetchModuleRecords('courses', instId).catch(() => []),
                    apiService.fetchModuleRecords('course_levels', instId).catch(() => []),
                    apiService.fetchModuleRecords('election_voters_ledger', instId).catch(() => [])
                ]);

                setElection(elecData);
                setCandidates(candData);
                setBallots(ballotsData);
                setUsers(usersData);
                setCourses(coursesData || []);
                setCourseLevels(levelsData || []);
                setVotersLedger((ledgerData || []).filter((l: any) => l.electionId === electionId));

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
    }, [electionId]);

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

    // Timer effect for voting close
    useEffect(() => {
        if (!election || election.status === 'closed') {
            setTimeLeft(null);
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(election.endTime).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft(null);
                return;
            }

            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [election]);

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

    const enrichedCandidates = useMemo(() => {
        return candidates.map(c => {
            const profile = users.find(u => u.id === c.studentId);
            return {
                ...c,
                studentName: profile?.name || 'Unknown Candidate',
                studentPhoto: c.posterUrl || (profile as any)?.photoUrl || (profile as any)?.photo || null
            };
        });
    }, [candidates, users]);

    // Class (Course) Turnout List
    const classStats = useMemo(() => {
        if (!election) return [];
        const students = users.filter(u => u.role === 'student' && u.institutionId === election.institutionId);
        
        return courses.map(course => {
            const studentsInClass = students.filter(s => s.courseId === course.id);
            const votedInClass = votersLedger.filter(l => 
                studentsInClass.some(s => s.id === l.studentId)
            );
            return {
                id: course.id,
                name: course.name,
                code: course.code,
                total: studentsInClass.length,
                voted: votedInClass.length,
                percentage: studentsInClass.length > 0 ? Math.round((votedInClass.length / studentsInClass.length) * 100) : 0
            };
        }).filter(c => c.total > 0)
          .sort((a, b) => b.percentage - a.percentage);
    }, [election, users, courses, votersLedger]);

    // Stream (CourseLevel) Turnout List
    const streamStats = useMemo(() => {
        if (!election) return [];
        const students = users.filter(u => u.role === 'student' && u.institutionId === election.institutionId);

        return courses.flatMap(course => {
            return (course.levels || []).map((level: any) => {
                const studentsInLevel = students.filter(s => s.courseId === course.id && s.courseLevelId === level.id);
                const votedInLevel = votersLedger.filter(l => 
                    studentsInLevel.some(s => s.id === l.studentId)
                );
                return {
                    id: level.id,
                    courseId: course.id,
                    courseName: course.name,
                    levelName: level.name,
                    fullName: `${course.name} - ${level.name}`,
                    total: studentsInLevel.length,
                    voted: votedInLevel.length,
                    percentage: studentsInLevel.length > 0 ? Math.round((votedInLevel.length / studentsInLevel.length) * 100) : 0
                };
            });
        }).filter(s => s.total > 0)
          .sort((a, b) => b.percentage - a.percentage);
    }, [election, users, courses, votersLedger]);

    // Recent votes activity feed (Anonymous)
    const recentVotesFeed = useMemo(() => {
        if (!election) return [];
        const students = users.filter(u => u.role === 'student' && u.institutionId === election.institutionId);

        return votersLedger
            .map(l => {
                const student = students.find(s => s.id === l.studentId);
                const course = student ? courses.find(c => c.id === student.courseId) : null;
                const level = student && course ? (course.levels || []).find((lev: any) => lev.id === student.courseLevelId) : null;
                return {
                    id: l.id,
                    votedAt: new Date(l.votedAt),
                    className: course?.name || 'Class',
                    streamName: level?.name || 'Stream',
                    timeStr: new Date(l.votedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                };
            })
            .sort((a, b) => b.votedAt.getTime() - a.votedAt.getTime())
            .slice(0, 12);
    }, [election, users, courses, votersLedger]);

    // Candidates Slide Show Rotation
    useEffect(() => {
        if (enrichedCandidates.length === 0) return;
        const interval = setInterval(() => {
            setCurrentSlideIndex(prev => (prev + 1) % enrichedCandidates.length);
        }, 5500);
        return () => clearInterval(interval);
    }, [enrichedCandidates.length]);

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
                @keyframes slideProgress {
                    0% { width: 0%; }
                    100% { width: 100%; }
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

                {/* Projector Tab switcher */}
                <div className="bg-slate-900/50 border border-slate-800/80 p-1.5 rounded-[2rem] flex items-center gap-1.5 backdrop-blur-md">
                    <button
                        onClick={() => setProjectorView('overview')}
                        className={`px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${projectorView === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Tv className="w-3.5 h-3.5" /> Election Overview
                    </button>
                    <button
                        onClick={() => setProjectorView('turnout')}
                        className={`px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${projectorView === 'turnout' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Activity className="w-3.5 h-3.5 animate-pulse text-indigo-400" /> Class Turnout Stream
                    </button>
                </div>

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

                    {/* 3D Countdown to Voting Close */}
                    {timeLeft && election.status !== 'closed' && (
                        <div className="flex flex-col items-center space-y-4 py-4 animate-in fade-in slide-in-from-top-6">
                            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.25em] flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" /> Time Left Until Polls Close
                            </span>
                            <div className="flex gap-4" style={{ perspective: '1000px' }}>
                                {/* Hours Box */}
                                <div className="flex flex-col items-center">
                                    <div 
                                        className="w-16 h-20 rounded-2xl bg-gradient-to-b from-[#1b233d] to-[#0d1224] border border-[#2b3558] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.6),inset_0_2px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden"
                                        style={{ transform: 'rotateX(15deg)', transformStyle: 'preserve-3d' }}
                                    >
                                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#070b19]/60" />
                                        <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                                            {String(timeLeft.hours).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest mt-2">Hours</span>
                                </div>
                                <span className="text-3xl font-black text-indigo-500 self-center -mt-4 animate-pulse">:</span>
                                {/* Minutes Box */}
                                <div className="flex flex-col items-center">
                                    <div 
                                        className="w-16 h-20 rounded-2xl bg-gradient-to-b from-[#1b233d] to-[#0d1224] border border-[#2b3558] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.6),inset_0_2px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden"
                                        style={{ transform: 'rotateX(15deg)', transformStyle: 'preserve-3d' }}
                                    >
                                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#070b19]/60" />
                                        <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                                            {String(timeLeft.minutes).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest mt-2">Minutes</span>
                                </div>
                                <span className="text-3xl font-black text-indigo-500 self-center -mt-4 animate-pulse">:</span>
                                {/* Seconds Box */}
                                <div className="flex flex-col items-center">
                                    <div 
                                        className="w-16 h-20 rounded-2xl bg-gradient-to-b from-[#1b233d] to-[#0d1224] border border-[#2b3558] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.6),inset_0_2px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden"
                                        style={{ transform: 'rotateX(15deg)', transformStyle: 'preserve-3d' }}
                                    >
                                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#070b19]/60" />
                                        <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                                            {String(timeLeft.seconds).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest mt-2">Seconds</span>
                                </div>
                            </div>
                        </div>
                    )}

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
                        <div className="bg-[#0b0f20]/60 backdrop-blur-xl p-16 rounded-[4.5rem] border border-indigo-500/20 text-center max-w-xl mx-auto shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden animate-in fade-in zoom-in-95">
                            {/* Accent background glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-indigo-400 mb-10">Declaring Winners</h3>
                            <div className="flex justify-center" style={{ perspective: '1000px' }}>
                                <div 
                                    className="w-32 h-40 rounded-3xl bg-gradient-to-b from-[#1b233d] to-[#0c1020] border-2 border-[#3b4778] flex items-center justify-center shadow-[0_20px_40px_-6px_rgba(0,0,0,0.9),inset_0_4px_0_0_rgba(255,255,255,0.08),0_0_30px_rgba(99,102,241,0.3)] relative overflow-hidden animate-bounce"
                                    style={{ transform: 'rotateX(15deg)', transformStyle: 'preserve-3d' }}
                                >
                                    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-[#070b19]/80 shadow-[0_1px_0_0_rgba(255,255,255,0.08)]" />
                                    <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-300 drop-shadow-[0_0_20px_rgba(99,102,241,0.8)]">
                                        {countdown}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-450 uppercase tracking-[0.2em] mt-10 font-black">Hold your breath for the reveal...</p>
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
                    {projectorView === 'turnout' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-300 items-start">
                            {/* Left/Middle: Live Scoreboards */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-slate-900/20 backdrop-blur-md p-10 rounded-[3.5rem] border border-slate-800/80 shadow-xl space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-4">
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                                <TrendingUp className="w-6 h-6 text-indigo-400" /> Class Turnout Scoreboard
                                            </h3>
                                            <p className="text-[9px] font-black uppercase text-slate-450 tracking-widest mt-1">Live participation streaming by class group</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-slate-950 border border-slate-850 text-slate-400">
                                            {classStats.length} Classes Active
                                        </span>
                                    </div>

                                    {classStats.length === 0 ? (
                                        <div className="text-center py-10">
                                            <p className="text-slate-450 text-xs italic">No class statistics available. Verify student registrations.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {classStats.map(cls => {
                                                // Find streams inside this class to show as tiny sub-stats
                                                const clsStreams = streamStats.filter(s => s.courseId === cls.id);
                                                
                                                // Color determination for class progress
                                                const isHigh = cls.percentage >= 80;
                                                const isMed = cls.percentage >= 50 && cls.percentage < 80;
                                                const progressColorClass = isHigh 
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                                                    : isMed 
                                                        ? 'bg-gradient-to-r from-indigo-500 to-blue-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';

                                                return (
                                                    <div 
                                                        key={cls.id} 
                                                        className="bg-slate-950/40 border border-slate-900/60 p-6 rounded-[2.5rem] flex flex-col justify-between hover:border-slate-850 transition-all group relative overflow-hidden"
                                                    >
                                                        {/* Top visual accents */}
                                                        {isHigh && (
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                                                        )}
                                                        <div>
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full tracking-wider">{cls.code || 'CLS'}</span>
                                                                    <h4 className="text-lg font-black uppercase text-white tracking-tight mt-1">{cls.name}</h4>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`text-2xl font-black ${isHigh ? 'text-emerald-400' : isMed ? 'text-indigo-400' : 'text-amber-500'}`}>
                                                                        {cls.percentage}%
                                                                    </span>
                                                                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{cls.voted} / {cls.total} Voted</p>
                                                                </div>
                                                            </div>

                                                            <div className="w-full bg-slate-900/80 h-2.5 rounded-full overflow-hidden border border-slate-900 mb-4">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${progressColorClass}`} 
                                                                    style={{ width: `${cls.percentage}%` }} 
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Mini Streams List */}
                                                        {clsStreams.length > 0 && (
                                                            <div className="mt-2 border-t border-slate-900/80 pt-3 space-y-1.5">
                                                                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Stream Turnout</p>
                                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                                    {clsStreams.map(str => (
                                                                        <div key={str.id} className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-900/80">
                                                                            <span className="text-slate-400 truncate max-w-[65px] font-medium">{str.levelName}</span>
                                                                            <span className={`font-bold ${str.percentage >= 80 ? 'text-emerald-400' : str.percentage >= 50 ? 'text-indigo-400' : 'text-amber-500'}`}>
                                                                                {str.percentage}%
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Leaderboards & Activity Feed */}
                            <div className="space-y-8">
                                {/* Turnout Leaderboard widget */}
                                <div className="bg-slate-900/20 backdrop-blur-md p-8 rounded-[3.5rem] border border-slate-800/80 shadow-xl space-y-6">
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                                            <Award className="w-5 h-5 text-indigo-400" /> Turnout Leaderboard
                                        </h3>
                                        <p className="text-[8px] font-black uppercase text-slate-450 tracking-widest mt-0.5">Top performing streams</p>
                                    </div>

                                    <div className="space-y-3.5">
                                        {streamStats.slice(0, 5).map((stream, idx) => {
                                            const isTop = idx === 0;
                                            return (
                                                <div 
                                                    key={stream.id} 
                                                    className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-slate-900 rounded-[2rem] hover:border-slate-850 transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${
                                                            idx === 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                                            idx === 1 ? 'bg-slate-400/10 text-slate-400 border border-slate-400/20' :
                                                            idx === 2 ? 'bg-amber-700/10 text-amber-700 border border-amber-700/20' :
                                                            'bg-slate-900 text-slate-500'
                                                        }`}>
                                                            {idx + 1}
                                                        </span>
                                                        <div className="text-left">
                                                            <p className="text-xs font-black uppercase tracking-tight text-white">{stream.fullName}</p>
                                                            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{stream.voted} / {stream.total} cast</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-sm font-black ${isTop ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                                        {stream.percentage}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {streamStats.length === 0 && (
                                            <p className="text-slate-450 text-xs italic text-center py-4">No stream stats calculated yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Live Activity Ticker widget */}
                                <div className="bg-slate-900/20 backdrop-blur-md p-8 rounded-[3.5rem] border border-slate-800/80 shadow-xl space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                                                <Activity className="w-5 h-5 text-emerald-400 animate-pulse" /> Live Streaming Activity
                                            </h3>
                                            <p className="text-[8px] font-black uppercase text-slate-450 tracking-widest mt-0.5">Real-time anonymous ballot entries</p>
                                        </div>
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                    </div>

                                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                                        {recentVotesFeed.map(feed => (
                                            <div 
                                                key={feed.id} 
                                                className="p-3 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center justify-between text-left text-xs gap-3 animate-in fade-in duration-200"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                                    <div>
                                                        <p className="text-slate-200 font-bold uppercase tracking-tight">Vote Cast Successfully</p>
                                                        <p className="text-[8.5px] font-black uppercase text-slate-450 mt-0.5 tracking-wider">
                                                            {feed.className} — {feed.streamName}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-bold text-slate-500 shrink-0 uppercase tracking-widest">{feed.timeStr}</span>
                                            </div>
                                        ))}

                                        {recentVotesFeed.length === 0 && (
                                            <div className="text-center py-6 text-slate-450 text-xs italic">
                                                Waiting for incoming ballots...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        countdown === null && isMasked && election.status !== 'closed' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                                {/* Left Column: Polling Status & Info */}
                                <div className="bg-slate-900/30 backdrop-blur-sm p-12 rounded-[3.5rem] border border-slate-800 flex flex-col justify-center text-center lg:text-left space-y-6">
                                    <div>
                                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                                            <Clock className="w-10 h-10 text-indigo-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-3.5 py-1 rounded-full tracking-widest">Polling In Progress</span>
                                        </div>
                                        <h3 className="text-3xl font-black uppercase tracking-tight text-white mb-3">Wait For The Results</h3>
                                        <p className="text-slate-400 text-xs leading-relaxed max-w-md">
                                            Electoral logs are streaming and votes are being tallied securely in real-time. Results will be calculated and projected automatically as soon as the election closes.
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-800/80 flex justify-center lg:justify-start">
                                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-[9px] uppercase tracking-widest font-black text-slate-400">
                                            <AlertCircle className="w-4 h-4 text-amber-500" /> Results unlock when election closes
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Dynamic Branded Candidate Slideshow */}
                                {enrichedCandidates.length > 0 && (
                                    <div className="bg-slate-900/20 backdrop-blur-md p-10 rounded-[3.5rem] border border-slate-800/80 shadow-xl flex flex-col justify-between relative overflow-hidden h-[420px] transition-all">
                                        {/* Rotating top background glow */}
                                        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500/10 rounded-full blur-[60px]" />
                                        
                                        {/* Slideshow Progress Bar indicator */}
                                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900">
                                            <div 
                                                key={currentSlideIndex}
                                                className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-r transition-all" 
                                                style={{
                                                    animation: 'slideProgress 5.5s linear forwards',
                                                    width: '0%'
                                                }}
                                            />
                                        </div>

                                        {/* Candidate Card Contents */}
                                        {(() => {
                                            const currentCand = enrichedCandidates[currentSlideIndex];
                                            if (!currentCand) return null;
                                            return (
                                                <div 
                                                    key={currentCand.id} 
                                                    className="flex flex-col h-full justify-between animate-fade-in py-4"
                                                >
                                                    {/* Header Details */}
                                                    <div className="flex gap-5 items-center">
                                                        <div className="gradient-border-wrap animated-candidate-photo shrink-0 scale-110">
                                                            <div className="gradient-border-inner p-[1.5px]">
                                                                {currentCand.studentPhoto ? (
                                                                    <img src={currentCand.studentPhoto} alt={currentCand.studentName} className="w-16 h-16 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center font-black text-indigo-400 text-lg">
                                                                        {currentCand.studentName?.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1 text-left">
                                                            <span className="inline-block text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full tracking-wider">{currentCand.position}</span>
                                                            <h4 className="text-2xl font-black uppercase tracking-tight text-white">{currentCand.studentName}</h4>
                                                            {currentCand.tagline && (
                                                                <p className="text-slate-400 text-xs italic">"{currentCand.tagline}"</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Candidate Manifesto / Profile */}
                                                    <div className="bg-slate-950/40 border border-slate-900 rounded-[2rem] p-6 my-4 flex-grow flex flex-col justify-center text-left">
                                                        <h5 className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Candidate Manifesto</h5>
                                                        <p className="text-slate-300 text-xs leading-relaxed italic overflow-y-auto max-h-[140px]">
                                                            {currentCand.manifesto || 'No manifesto details provided. Nominated to bring proactive leadership and student advocacy.'}
                                                        </p>
                                                    </div>

                                                    {/* Slide Nav / Indicators */}
                                                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500 tracking-widest mt-2">
                                                        <span>Nominated Profile</span>
                                                        <div className="flex gap-2">
                                                            {enrichedCandidates.map((_, idx) => (
                                                                <button 
                                                                    key={idx}
                                                                    onClick={() => setCurrentSlideIndex(idx)}
                                                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-indigo-400 w-5' : 'bg-slate-800'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span>Candidate {currentSlideIndex + 1} of {enrichedCandidates.length}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
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
                        )
                    )}
                </div>
            )}
        </div>
    );
};
