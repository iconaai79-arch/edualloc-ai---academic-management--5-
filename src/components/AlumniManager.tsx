
import React, { useState, useMemo, useEffect } from 'react';
import { apiService } from '../services/apiService';
import {
    GraduationCap, Users, Briefcase, Calendar, Star, Heart,
    Search, Plus, CheckCircle, XCircle, ChevronRight,
    MapPin, Trophy, BookOpen, Building2, ArrowRight,
    Phone, Mail, Globe, DollarSign, TrendingUp, Filter,
    Bell, Award, Handshake, UserCheck, Clock, Target
} from 'lucide-react';
import type { Institution, User, SchoolRegistry } from '../types';

interface AlumniMember {
    id: string;
    name: string;
    email: string;
    phone?: string;
    admissionNumber?: string;
    schoolId: string;
    schoolName: string;
    graduationYear: string;
    course: string;
    profession: string;
    company: string;
    location: string;
    bio: string;
    status: 'pending' | 'verified' | 'rejected' | 'deactivated';
    website?: string;
    linkedIn?: string;
    profilePhotoUrl?: string;
    achievements?: string[];
    joinedAt: string;
}

interface AlumniJob {
    id: string;
    title: string;
    company: string;
    location: string;
    type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Remote';
    postedBy: string;
    description: string;
    deadline: string;
    postedAt: string;
}

interface AlumniEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    venue: string;
    type: 'Reunion' | 'Career Fair' | 'Fundraiser' | 'Homecoming' | 'Awards' | 'Webinar';
    description: string;
    rsvpCount: number;
}

interface AlumniManagerProps {
    currentInstitution: Institution;
    users: User[];
    allInstitutions?: Institution[];
    onAccessAlumnaPortal?: (school: any) => void;
    schoolRegistry?: SchoolRegistry[];
}

const SAMPLE_ALUMNI: AlumniMember[] = [
    { id: '1', name: 'Dr. Sarah Kamau', admissionNumber: 'ADM/2001/045', email: 'sarah@example.com', schoolId: 'sch1', schoolName: 'Nairobi Academy', graduationYear: '2005', course: 'Medicine', profession: 'Neurosurgeon', company: 'Kenyatta National Hospital', location: 'Nairobi, Kenya', bio: 'Pioneer in minimally invasive neurosurgery in East Africa.', status: 'verified', achievements: ['Best Student 2005', 'WHO Fellow 2018'], joinedAt: '2024-01-10' },
    { id: '2', name: 'James Odhiambo', admissionNumber: 'ADM/2006/892', email: 'james@example.com', schoolId: 'sch1', schoolName: 'Nairobi Academy', graduationYear: '2010', course: 'Computer Science', profession: 'CTO', company: 'TechHub Africa', location: 'Kampala, Uganda', bio: 'Building Africa\'s next unicorn tech startup.', status: 'verified', achievements: ['Forbes 30 under 30 Africa'], joinedAt: '2024-02-15' },
    { id: '3', name: 'Fatuma Hassan', admissionNumber: 'ADM/2011/112', email: 'fatuma@example.com', schoolId: 'sch2', schoolName: 'Stars Secondary', graduationYear: '2015', course: 'Law', profession: 'Advocate', company: 'Hassan & Partners', location: 'Mombasa, Kenya', bio: 'Human rights advocate with 10+ years experience.', status: 'pending', joinedAt: '2025-01-20' },
];

const SAMPLE_JOBS: AlumniJob[] = [
    { id: 'j1', title: 'Senior Software Engineer', company: 'Safaricom PLC', location: 'Nairobi', type: 'Full-time', postedBy: 'James Odhiambo', description: 'Join our engineering team building mobile financial services at scale.', deadline: '2026-05-01', postedAt: '2026-04-01' },
    { id: 'j2', title: 'Medical Intern', company: 'Aga Khan Hospital', location: 'Nairobi', type: 'Internship', postedBy: 'Dr. Sarah Kamau', description: 'Structured internship program for medical graduates.', deadline: '2026-04-30', postedAt: '2026-04-05' },
    { id: 'j3', title: 'Legal Associate', company: 'Hassan & Partners', location: 'Mombasa (Remote)', type: 'Remote', postedBy: 'Fatuma Hassan', description: 'Contract legal research and drafting work.', deadline: '2026-05-15', postedAt: '2026-04-08' },
];

const SAMPLE_EVENTS: AlumniEvent[] = [
    { id: 'e1', title: 'Class of 2005 Reunion', date: 'Aug 15, 2026', time: '4:00 PM', venue: 'Windsor Hotel, Nairobi', type: 'Reunion', description: '20-year class reunion with dinner, awards, and networking.', rsvpCount: 47 },
    { id: 'e2', title: 'Annual Homecoming Gala', date: 'Oct 03, 2026', time: '6:00 PM', venue: 'School Grounds', type: 'Homecoming', description: 'Our flagship annual event bringing all alumni together.', rsvpCount: 218 },
    { id: 'e3', title: 'Alumni Career Fair 2026', date: 'Sep 20, 2026', time: '9:00 AM', venue: 'Virtual (Zoom)', type: 'Career Fair', description: 'Alumni-driven job fair for current students and graduates.', rsvpCount: 134 },
];

export const AlumniManager: React.FC<AlumniManagerProps> = ({ currentInstitution, users, allInstitutions = [], onAccessAlumnaPortal, schoolRegistry = [] }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'directory' | 'jobs' | 'events' | 'achievements' | 'donations' | 'admin'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedSchool, setSelectedSchool] = useState('all');
    const [showAddJobModal, setShowAddJobModal] = useState(false);
    const [showAddEventModal, setShowAddEventModal] = useState(false);
    const [alumni, setAlumni] = useState<AlumniMember[]>([]);
    const [jobs, setJobs] = useState<AlumniJob[]>([]);
    const [events, setEvents] = useState<AlumniEvent[]>([]);
    const [donationAmount, setDonationAmount] = useState('');
    const [donationFund, setDonationFund] = useState('General Scholarship Fund');

    useEffect(() => {
        const loadAlumniData = async () => {
            try {
                const [dbAlumni, dbJobs, dbEvents] = await Promise.all([
                    apiService.fetchModuleRecords<AlumniMember>('alumni_members', currentInstitution.id).catch(() => []),
                    apiService.fetchModuleRecords<AlumniJob>('alumni_jobs', currentInstitution.id).catch(() => []),
                    apiService.fetchModuleRecords<AlumniEvent>('alumni_events', currentInstitution.id).catch(() => [])
                ]);
                // Filter by institution as a secondary guard
                const filteredAlumni = (dbAlumni || []).filter(a => !a.schoolId || a.schoolId === currentInstitution.id || allInstitutions.some(i => i.id === a.schoolId));
                setAlumni(filteredAlumni.length > 0 ? filteredAlumni : SAMPLE_ALUMNI.map(a => ({ ...a, schoolId: currentInstitution.id, schoolName: currentInstitution.name })));
                setJobs((dbJobs || []).length > 0 ? dbJobs : SAMPLE_JOBS);
                setEvents((dbEvents || []).length > 0 ? dbEvents : SAMPLE_EVENTS);
            } catch (e) {
                console.error('Failed to load alumni data:', e);
                setAlumni(SAMPLE_ALUMNI.map(a => ({ ...a, schoolId: currentInstitution.id, schoolName: currentInstitution.name })));
                setJobs(SAMPLE_JOBS);
                setEvents(SAMPLE_EVENTS);
            }
        };
        loadAlumniData();
    }, [currentInstitution.id]);

    const handleStatusChange = async (memberId: string, newStatus: AlumniMember['status']) => {
        try {
            const member = alumni.find(a => a.id === memberId);
            if (!member) return;

            const updatedMember = { ...member, status: newStatus };
            
            // Persist status change to the database
            await apiService.saveModuleRecord('alumni_members', updatedMember).catch(e => console.warn('Could not persist alumni status:', e));
            
            setAlumni(prev => prev.map(a => a.id === memberId ? updatedMember : a));
        } catch (e) {
            console.error("Status Update Failed:", e);
        }
    };

    // Filter schools that are Education type from all institutions
    const schools = useMemo(() => {
        return allInstitutions.filter(inst =>
            ['Education', 'Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'TVET'].includes(inst.institutionType) ||
            ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'TVET', 'Driving School'].includes(inst.category || '')
        );
    }, [allInstitutions]);

    const verifiedAlumni = alumni.filter(a => a.status === 'verified');
    const pendingAlumni = alumni.filter(a => a.status === 'pending');
    const deactivatedAlumni = alumni.filter(a => a.status === 'deactivated');

    const filteredAlumni = useMemo(() => verifiedAlumni.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesYear = selectedYear === 'all' || a.graduationYear === selectedYear;
        const matchesSchool = selectedSchool === 'all' || a.schoolId === selectedSchool;
        return matchesSearch && matchesYear && matchesSchool;
    }), [verifiedAlumni, searchTerm, selectedYear, selectedSchool]);

    const jobTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'Full-time': 'bg-blue-100 text-blue-700',
            'Part-time': 'bg-purple-100 text-purple-700',
            'Contract': 'bg-amber-100 text-amber-700',
            'Internship': 'bg-emerald-100 text-emerald-700',
            'Remote': 'bg-indigo-100 text-indigo-700',
        };
        return colors[type] || 'bg-slate-100 text-slate-600';
    };

    const eventTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'Reunion': 'bg-rose-100 text-rose-700',
            'Career Fair': 'bg-blue-100 text-blue-700',
            'Fundraiser': 'bg-emerald-100 text-emerald-700',
            'Homecoming': 'bg-amber-100 text-amber-700',
            'Awards': 'bg-purple-100 text-purple-700',
            'Webinar': 'bg-indigo-100 text-indigo-700',
        };
        return colors[type] || 'bg-slate-100 text-slate-600';
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'directory', label: 'Alumni Directory', icon: Users },
        { id: 'jobs', label: 'Job Board', icon: Briefcase },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'achievements', label: 'Achievements', icon: Trophy },
        { id: 'donations', label: 'Give Back', icon: Heart },
        { id: 'admin', label: 'Admin', icon: UserCheck },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur">
                                <GraduationCap className="w-8 h-8 text-blue-300" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Learning Institution</p>
                                <h1 className="text-3xl font-black uppercase tracking-tighter">{currentInstitution.name}</h1>
                            </div>
                        </div>
                        <p className="text-blue-200 text-sm font-medium">Alumni Network — Connecting generations of excellence</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Verified Alumni', value: verifiedAlumni.length },
                            { label: 'Jobs Posted', value: jobs.length },
                            { label: 'Events', value: events.length },
                        ].map((s, i) => (
                            <div key={i} className="text-center bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                                <p className="text-2xl font-black text-white">{s.value}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm p-2 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.id === 'admin' && pendingAlumni.length > 0 && (
                                <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
                                    {pendingAlumni.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Alumni', value: alumni.length, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Pending Verification', value: pendingAlumni.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Active Mentors', value: 8, icon: Handshake, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Total Raised', value: 'KES 2.4M', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 ${s.bg} ${s.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                                        <s.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{s.label}</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{s.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Alumni */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                                <Users className="w-5 h-5 text-indigo-600" />
                                Recent Members
                            </h3>
                            <div className="space-y-4">
                                {verifiedAlumni.slice(0, 3).map(a => (
                                    <div key={a.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-2xl transition-all cursor-pointer group">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-lg group-hover:scale-105 transition-transform overflow-hidden">
                                            {a.profilePhotoUrl ? (
                                                <img loading="lazy" src={a.profilePhotoUrl} alt={a.name} className="w-full h-full object-cover" />
                                            ) : a.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight truncate">{a.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{a.profession} · {a.company}</p>
                                        </div>
                                        <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest">'{a.graduationYear.slice(-2)}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setActiveTab('directory')} className="w-full mt-6 py-3 border-2 border-dashed border-indigo-100 rounded-2xl text-indigo-500 font-black text-[10px] uppercase tracking-widest hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                View Full Directory <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Upcoming Events */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-rose-500" />
                                Upcoming Events
                            </h3>
                            <div className="space-y-4">
                                {events.map(ev => (
                                    <div key={ev.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer group">
                                        <div className="w-14 h-14 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center shadow-sm flex-shrink-0">
                                            <span className="text-[9px] font-black text-indigo-600 uppercase">{ev.date.split(' ')[0]}</span>
                                            <span className="text-lg font-black text-slate-800 dark:text-white leading-none">{ev.date.split(' ')[1].replace(',', '')}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight truncate">{ev.title}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.venue}</p>
                                        </div>
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${eventTypeColor(ev.type)}`}>{ev.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Latest Jobs */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
                                <Briefcase className="w-5 h-5 text-emerald-600" />
                                Latest Opportunities
                            </h3>
                            <button onClick={() => setActiveTab('jobs')} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                                View All <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {jobs.map(job => (
                                <div key={job.id} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-indigo-200 transition-all cursor-pointer group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                            <Building2 className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${jobTypeColor(job.type)}`}>{job.type}</span>
                                    </div>
                                    <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight mb-1">{job.title}</h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{job.company} · {job.location}</p>
                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-3">Deadline: {job.deadline}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── DIRECTORY ── */}
            {activeTab === 'directory' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Filters */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by name, profession, company..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 transition-colors text-sm"
                            />
                        </div>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                            className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-white focus:outline-none focus:border-indigo-400 transition-colors text-sm"
                        >
                            <option value="all">All Years</option>
                            {['2025','2020','2015','2010','2005','2000'].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {schools.length > 0 && (
                            <select
                                value={selectedSchool}
                                onChange={e => setSelectedSchool(e.target.value)}
                                className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-white focus:outline-none focus:border-indigo-400 transition-colors text-sm"
                            >
                                <option value="all">All Schools</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Alumni Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAlumni.map(a => (
                            <div key={a.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group">
                                {/* Card Header */}
                                <div className="h-24 bg-gradient-to-br from-indigo-600 to-blue-700 relative">
                                    <div className="absolute bottom-0 left-8 translate-y-1/2">
                                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white shadow-xl flex items-center justify-center text-2xl font-black text-indigo-600 overflow-hidden">
                                            {a.profilePhotoUrl ? (
                                                <img loading="lazy" src={a.profilePhotoUrl} alt={a.name} className="w-full h-full object-cover" />
                                            ) : a.name.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="absolute top-4 right-4">
                                        <span className="text-[9px] font-black bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full uppercase tracking-widest">Class of {a.graduationYear}</span>
                                    </div>
                                </div>
                                <div className="pt-12 pb-6 px-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{a.name}</h4>
                                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{a.profession}</p>
                                        </div>
                                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    </div>
                                    <div className="mt-3 space-y-1">
                                        <p className="text-xs text-slate-500 flex items-center gap-2"><Building2 className="w-3.5 h-3.5" />{a.company}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{a.location}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" />{a.schoolName}</p>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-4 italic line-clamp-2">"{a.bio}"</p>
                                    {a.achievements && a.achievements.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {a.achievements.map((ach, i) => (
                                                <span key={i} className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-widest">{ach}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-4 flex gap-2">
                                        <button className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1">
                                            <Mail className="w-3 h-3" /> Connect
                                        </button>
                                        <button className="flex-1 py-2.5 bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-1">
                                            <Globe className="w-3 h-3" /> Profile
                                        </button>
                                    </div>
                                    {onAccessAlumnaPortal && (
                                        <button 
                                            onClick={() => {
                                                const school = (schoolRegistry || []).find(s => s.id === a.schoolId || s.name === a.schoolName);
                                                if (school) onAccessAlumnaPortal(school);
                                                else alert("School registry record not found for this member's institution.");
                                            }}
                                            className="mt-2 w-full py-2.5 bg-rose-50 text-rose-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                        >
                                            <Heart className="w-3 h-3" /> Alumnae Portal
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredAlumni.length === 0 && (
                        <div className="text-center py-20 text-slate-400">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="font-black uppercase tracking-widest text-sm">No alumni found</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── JOB BOARD ── */}
            {activeTab === 'jobs' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white flex items-center gap-3">
                            <Briefcase className="w-7 h-7 text-emerald-600" />
                            Job Board
                        </h2>
                        <button
                            onClick={() => setShowAddJobModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Post Opportunity
                        </button>
                    </div>
                    <div className="space-y-4">
                        {jobs.map(job => (
                            <div key={job.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group">
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    <div className="p-5 bg-emerald-50 rounded-2xl flex-shrink-0">
                                        <Building2 className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{job.title}</h3>
                                                <p className="text-sm text-slate-500 font-bold mt-1 flex items-center gap-2">
                                                    <Building2 className="w-4 h-4" />{job.company}
                                                    <MapPin className="w-4 h-4 ml-2" />{job.location}
                                                </p>
                                            </div>
                                            <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${jobTypeColor(job.type)}`}>{job.type}</span>
                                        </div>
                                        <p className="text-slate-500 text-sm mb-4">{job.description}</p>
                                        <div className="flex flex-wrap justify-between items-center gap-3">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Star className="w-3 h-3" />Posted by {job.postedBy}</span>
                                                <span className="text-[9px] font-black uppercase text-red-400 tracking-widest flex items-center gap-1"><Clock className="w-3 h-3" />Deadline: {job.deadline}</span>
                                            </div>
                                            <button className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-100">
                                                Apply Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── EVENTS ── */}
            {activeTab === 'events' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white flex items-center gap-3">
                            <Calendar className="w-7 h-7 text-rose-500" />
                            Events & Reunions
                        </h2>
                        <button
                            onClick={() => setShowAddEventModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Create Event
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map(ev => (
                            <div key={ev.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
                                <div className="h-4 bg-gradient-to-r from-rose-500 to-pink-600" />
                                <div className="p-8">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${eventTypeColor(ev.type)}`}>{ev.type}</span>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">RSVPs</p>
                                            <p className="text-lg font-black text-slate-800 dark:text-white">{ev.rsvpCount}</p>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">{ev.title}</h3>
                                    <p className="text-slate-500 text-xs mb-4">{ev.description}</p>
                                    <div className="space-y-2 mb-6">
                                        <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-rose-500" />{ev.date} at {ev.time}</p>
                                        <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-indigo-500" />{ev.venue}</p>
                                    </div>
                                    <button className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                                        RSVP Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── ACHIEVEMENTS ── */}
            {activeTab === 'achievements' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white flex items-center gap-3">
                        <Trophy className="w-7 h-7 text-amber-500" />
                        Achievement Wall
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {verifiedAlumni.filter(a => a.achievements && a.achievements.length > 0).map(a => (
                            <div key={a.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
                                        {a.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{a.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{a.profession} · Class of {a.graduationYear}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {a.achievements?.map((ach, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
                                            <Award className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{ach}</p>
                                        </div>
                                    ))}
                                </div>
                                <button className="mt-4 w-full py-2.5 border-2 border-dashed border-amber-200 rounded-2xl text-amber-500 font-black uppercase text-[9px] tracking-widest hover:border-amber-500 hover:bg-amber-50 transition-all">
                                    + Add Achievement
                                </button>
                            </div>
                        ))}
                        {/* Post New Achievement */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-8 rounded-[2.5rem] border-2 border-dashed border-amber-200 dark:border-amber-700 flex flex-col items-center justify-center text-center cursor-pointer hover:border-amber-500 transition-all group">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Star className="w-8 h-8 text-amber-600" />
                            </div>
                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Share Your Milestone</h4>
                            <p className="text-xs text-slate-500">Post promotions, awards, launches or any achievement to inspire fellow alumni.</p>
                            <button className="mt-6 px-8 py-3 bg-amber-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-700 active:scale-95 transition-all">
                                Post Achievement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DONATIONS ── */}
            {activeTab === 'donations' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white flex items-center gap-3">
                        <Heart className="w-7 h-7 text-rose-500" />
                        Give Back to Your School
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Donation Form */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white mb-6">Make a Donation</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Fund / Campaign</label>
                                    <select
                                        value={donationFund}
                                        onChange={e => setDonationFund(e.target.value)}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-400 transition-colors"
                                    >
                                        <option>General Scholarship Fund</option>
                                        <option>Science Lab Equipment</option>
                                        <option>School Library</option>
                                        <option>Student Welfare Fund</option>
                                        <option>Sports Facilities</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Amount (KES)</label>
                                    <div className="flex gap-3 mb-3">
                                        {['500', '1000', '5000', '10000'].map(amt => (
                                            <button key={amt}
                                                onClick={() => setDonationAmount(amt)}
                                                className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all ${donationAmount === amt ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:border-indigo-300'}`}
                                            >
                                                {parseInt(amt)?.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        value={donationAmount}
                                        onChange={e => setDonationAmount(e.target.value)}
                                        placeholder="Or enter custom amount..."
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 transition-colors"
                                    />
                                </div>
                                <button className="w-full py-5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-rose-200 dark:shadow-none hover:shadow-rose-300 active:scale-95 transition-all flex items-center justify-center gap-3">
                                    <Heart className="w-5 h-5" />
                                    Donate via M-Pesa
                                </button>
                            </div>
                        </div>

                        {/* Campaign Progress */}
                        <div className="space-y-6">
                            {[
                                { name: 'Scholarship Fund', raised: 1250000, target: 2000000, color: 'bg-indigo-600' },
                                { name: 'Science Lab', raised: 580000, target: 1500000, color: 'bg-emerald-600' },
                                { name: 'Library', raised: 320000, target: 500000, color: 'bg-amber-500' },
                            ].map(c => (
                                <div key={c.name} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{c.name}</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">KES {(c.raised / 1000).toFixed(0)}K</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-3">of KES {(c.target / 1000).toFixed(0)}K goal</p>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                        <div className={`h-full ${c.color} rounded-full transition-all duration-700`} style={{ width: `${Math.min((c.raised / c.target) * 100, 100)}%` }} />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{Math.round((c.raised / c.target) * 100)}% funded</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADMIN ── */}
            {activeTab === 'admin' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white flex items-center gap-3">
                        <UserCheck className="w-7 h-7 text-indigo-600" />
                        Admin — Membership Control
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Pending / New Arrivals
                            </h3>
                            {pendingAlumni.length === 0 && (
                                <div className="p-10 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                                    <CheckCircle className="w-10 h-10 text-emerald-500/30 mx-auto mb-3" />
                                    <p className="text-[10px] font-black uppercase text-slate-400">All members are verified</p>
                                </div>
                            )}
                            {pendingAlumni.map(a => (
                                <div key={a.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black overflow-hidden">
                                            {a.profilePhotoUrl ? <img loading="lazy" src={a.profilePhotoUrl} className="w-full h-full object-cover" /> : a.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800 dark:text-white uppercase text-xs">{a.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{a.admissionNumber} • {a.graduationYear}</p>
                                            <div className="flex gap-2 mt-3">
                                                <button 
                                                    onClick={() => handleStatusChange(a.id, 'verified')}
                                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                                                >
                                                    Verify
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusChange(a.id, 'rejected')}
                                                    className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                <UserCheck className="w-4 h-4" /> Active Alumnae (Audit)
                            </h3>
                            {verifiedAlumni.map(a => (
                                <div key={a.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm group">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-black overflow-hidden">
                                            {a.profilePhotoUrl ? <img loading="lazy" src={a.profilePhotoUrl} className="w-full h-full object-cover" /> : a.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-black text-slate-800 dark:text-white uppercase text-xs">{a.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{a.admissionNumber} • Verified</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleStatusChange(a.id, 'deactivated')}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" 
                                                    title="Deactivate Member"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-slate-500 mt-1 italic">Joined {new Date(a.joinedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats for Admin */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Registered', value: alumni.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Verified', value: verifiedAlumni.length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Pending', value: pendingAlumni.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Schools Connected', value: [...new Set(alumni.map(a => a.schoolId))].length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 ${s.bg} ${s.color} rounded-2xl`}><s.icon className="w-5 h-5" /></div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{s.label}</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{s.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

