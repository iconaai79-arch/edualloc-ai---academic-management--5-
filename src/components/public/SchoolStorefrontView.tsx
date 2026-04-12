import React, { useState, useEffect } from 'react';
import { Institution, BulletinItem, Course, AcademicLevel, User } from '../../types';
import { apiService } from '../../services/apiService';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { CalendarDaysIcon as CalendarIcon } from '../icons/CalendarDaysIcon';
import { GlobeAltIcon } from '../icons/GlobeAltIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { XIcon } from '../icons/XIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';

interface SchoolStorefrontViewProps {
    institutionId: string;
    onEnrollmentClick?: () => void;
}

export const SchoolStorefrontView: React.FC<SchoolStorefrontViewProps> = ({ institutionId, onEnrollmentClick }) => {
    const [school, setSchool] = useState<Institution | null>(null);
    const [news, setNews] = useState<BulletinItem[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [levels, setLevels] = useState<AcademicLevel[]>([]);
    const [teachersCount, setTeachersCount] = useState(0);
    const [studentsCount, setStudentsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'overview' | 'academics' | 'news' | 'admissions'>('overview');

    useEffect(() => {
        const loadSchoolData = async () => {
            setLoading(true);
            try {
                // Fetch School Details (ID or Slug)
                let resolvedSchool: Institution | null = null;
                const instsById = await apiService.fetchModuleRecords<Institution>('institutions', undefined, undefined, { filter: { id: institutionId } });
                
                if (instsById && instsById.length > 0) {
                    resolvedSchool = instsById[0];
                } else {
                    const instsBySlug = await apiService.fetchModuleRecords<Institution>('institutions', undefined, undefined, { filter: { slug: institutionId } });
                    if (instsBySlug && instsBySlug.length > 0) resolvedSchool = instsBySlug[0];
                }

                if (resolvedSchool) {
                    setSchool(resolvedSchool);
                    const [schoolNews, schoolCourses, schoolLevels, schoolUsers] = await Promise.all([
                        apiService.fetchModuleRecords<BulletinItem>('bulletin_items', resolvedSchool.id),
                        apiService.fetchCourses(resolvedSchool.id),
                        apiService.fetchAcademicLevels(resolvedSchool.id),
                        apiService.fetchUsers(resolvedSchool.id)
                    ]);

                    setNews((schoolNews || []).filter(n => n.status === 'Published').sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()));
                    setCourses(schoolCourses || []);
                    setLevels(schoolLevels || []);
                    
                    const teachers = (schoolUsers || []).filter(u => u.role === 'teacher' || u.role === 'lecturer');
                    const students = (schoolUsers || []).filter(u => u.role === 'student');
                    setTeachersCount(teachers.length || 12); // Fallback to demo data if empty
                    setStudentsCount(students.length || 450);
                    
                    document.title = `${resolvedSchool.name} | Excellence in Education`;
                }
            } catch (error) {
                console.error("Failed to load school storefront:", error);
            } finally {
                setLoading(false);
            }
        };

        if (institutionId) loadSchoolData();
    }, [institutionId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 animate-mesh opacity-20"></div>
                <div className="relative z-10 space-y-8 text-center">
                    <div className="w-24 h-24 border-t-4 border-indigo-500 rounded-full animate-spin mx-auto shadow-[0_0_50px_rgba(79,70,229,0.3)]"></div>
                    <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Initializing Academy Portal...</p>
                </div>
            </div>
        );
    }

    if (!school) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Academy Not Found</h1>
                <p className="text-slate-500 mb-8 uppercase text-xs font-bold tracking-widest">The requested educational institution profile is currently unavailable.</p>
                <button onClick={() => window.location.href = '/'} className="px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform shadow-2xl">
                    Return to Registry
                </button>
            </div>
        );
    }

    const themeColor = school.themeColor || '#4f46e5';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-20 font-sans selection:bg-indigo-500 selection:text-white">
            {/* Elite Navigation */}
            <nav className="fixed top-0 inset-x-0 z-[100] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div 
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => window.location.href = '/'}
                        >
                            {school.logoUrl ? (
                                <img src={school.logoUrl} alt={school.name} className="w-10 h-10 object-contain rounded-xl group-hover:scale-110 transition-transform" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl rotate-3 group-hover:rotate-0 transition-all" style={{ backgroundColor: themeColor }}>
                                    {school.name.charAt(0)}
                                </div>
                            )}
                            <div className="hidden sm:block">
                                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{school.name}</h1>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Academy Portal</p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        {['overview', 'academics', 'news', 'admissions'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setActiveSection(s as any)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === s ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => window.location.href = `/?view=login&institution=${school.id}`}
                            className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                        >
                            Portal Login
                        </button>
                    </div>
                </div>
            </nav>

            {/* Immersive Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden">
                {/* Background Architecture */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50 dark:via-slate-950 to-slate-50 dark:to-slate-950 z-[1]"></div>
                    <div className="absolute inset-0 opacity-20 animate-mesh" style={{ color: themeColor }}></div>
                    
                    {/* Floating Geometric Academy Shapes */}
                    <div className="absolute top-1/4 left-10 w-64 h-64 bg-indigo-500/10 rounded-[3rem] blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                    
                    <div className="w-full h-full bg-white dark:bg-slate-950 flex items-center justify-center">
                        <div className="text-[25vw] font-black text-slate-900/[0.03] dark:text-white/[0.02] uppercase tracking-tighter select-none rotate-12">
                            {school.name.split(' ')[0]}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-3 bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 mb-10 animate-fade-in-up">
                        <SparklesIcon className="w-4 h-4 text-amber-500" />
                        Pioneering Modern Education
                    </div>
                    <h2 className="text-7xl md:text-9xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none italic mb-8 drop-shadow-2xl animate-fade-in-up">
                        Shape Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500">Future Here.</span>
                    </h2>
                    <p className="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed mb-12 animate-fade-in-up delay-100">
                        {school.name} combines heritage with state-of-the-art innovation to nurture the next generation of leaders, creators, and innovators. Join a community built on excellence.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up delay-200">
                        <button 
                            onClick={() => setActiveSection('admissions')}
                            className="w-full sm:w-auto px-12 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:scale-105 transition-transform shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
                        >
                            Apply Now
                        </button>
                        <button className="w-full sm:w-auto px-12 py-6 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-[2rem] border border-slate-200 dark:border-slate-700 font-black uppercase text-xs tracking-[0.3em] hover:bg-slate-50 transition-colors">
                            Virtual Tour
                        </button>
                    </div>

                    {/* Elite Stats Registry */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-24">
                        {[
                            { label: 'Enrolled Pupils', value: studentsCount, icon: UserGroupIcon, color: 'text-indigo-500' },
                            { label: 'Expert Faculty', value: teachersCount, icon: AcademicCapIcon, color: 'text-emerald-500' },
                            { label: 'Success Rate', value: '98%', icon: CheckBadgeIcon, color: 'text-amber-500' },
                            { label: 'Global Alumni', value: '10K+', icon: GlobeAltIcon, color: 'text-blue-500' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/20 dark:border-slate-800 shadow-xl hover:-translate-y-2 transition-all">
                                <stat.icon className={`w-6 h-6 ${stat.color} mb-4 mx-auto`} />
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 italic">{stat.value}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Content Section Hub */}
            <section className="max-w-7xl mx-auto px-6 mt-32">
                {activeSection === 'overview' && (
                    <div className="space-y-32">
                        {/* Vision & Mission Deep Dive */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-[4rem] blur-2xl group-hover:scale-110 transition-transform"></div>
                                <div className="relative h-[600px] bg-slate-200 dark:bg-slate-800 rounded-[4rem] overflow-hidden border border-white/20">
                                    <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" alt="Students" />
                                    <div className="absolute inset-x-0 bottom-0 p-12 bg-gradient-to-t from-slate-900 to-transparent">
                                        <p className="text-white text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                           "Innovation is at the heart of our curriculum."
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-12">
                                <div className="space-y-6">
                                    <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Our Institutional <span className="text-indigo-500">Core.</span></h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
                                        Founded on the principles of integrity and forward-thinking, {school.name} provides an environment where curiosity is celebrated and potential is realized. We don't just teach; we inspire.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl">
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic mb-4">Integrity</h4>
                                        <p className="text-slate-500 text-sm font-medium">Building strong character through honest engagement and ethical leadership.</p>
                                    </div>
                                    <div className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl">
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic mb-4">Heritage</h4>
                                        <p className="text-slate-500 text-sm font-medium">Honoring our traditions while embracing a technologically advanced future.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'academics' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-20 space-y-4">
                            <h3 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Academic Excellence</h3>
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Explore our diverse range of competitive programs</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {courses.map((course) => (
                                <div key={course.id} className="group bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all shadow-xl hover:-translate-y-4">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-500 mb-8 transition-transform group-hover:rotate-12 group-hover:scale-110">
                                        <BookOpenIcon className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-4">{course.name}</h4>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-loose">
                                        Curriculum: {course.curriculumType || 'Modern Standard'} <br />
                                        Code: <span className="text-indigo-500">{course.code}</span>
                                    </p>
                                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{course.levels?.length || 0} Levels Available</span>
                                        <ArrowRightIcon className="w-5 h-5 text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'news' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-20 space-y-4">
                            <h3 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Academy Hub</h3>
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Latest updates, insights and student life events</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {news.length > 0 ? news.map((item) => (
                                <div key={item.id} className="group flex flex-col md:flex-row gap-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all">
                                    <div className="md:w-1/3 aspect-square rounded-[2rem] overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-700">
                                                <CalendarIcon className="w-16 h-16 opacity-20" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-100 dark:border-slate-800">
                                                {item.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="md:w-2/3 flex flex-col justify-center space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {new Date(item.publishDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic truncate">{item.title}</h4>
                                        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{item.content.replace(/<[^>]*>/g, '')}</p>
                                        <button className="flex items-center gap-3 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-500 transition-colors">
                                            Read Full Story <ArrowRightIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-2 py-32 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                                    <CalendarIcon className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                    <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">Silence is Golden</h4>
                                    <p className="text-slate-400 text-[10px] font-black uppercase mt-2">Check back soon for upcoming news and academy updates.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSection === 'admissions' && (
                    <div className="animate-fade-in max-w-4xl mx-auto">
                        <div className="text-center mb-20 space-y-4">
                            <h3 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Join Our Legacy</h3>
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Streamlined digital application portal for new pupils</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-12 md:p-20 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5">
                                <AcademicCapIcon className="w-64 h-64" />
                            </div>
                            <div className="relative z-10 space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 font-black">1</div>
                                        <h5 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Initial Registry</h5>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Provide basic student details and previous academic documentation for vetting.</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 font-black">2</div>
                                        <h5 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Academy Interview</h5>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Our board of experts will evaluate the application to ensure behavioral and academic alignment.</p>
                                    </div>
                                </div>
                                <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
                                    <button 
                                        onClick={onEnrollmentClick}
                                        className="w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.5em] shadow-[0_20px_40px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 group"
                                    >
                                        Initiate Digital Application <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Global Modern Footer */}
            <footer className="max-w-7xl mx-auto px-6 mt-48">
                <div className="bg-slate-900 dark:bg-slate-900 p-12 md:p-24 rounded-[5rem] overflow-hidden relative border border-white/5">
                    <div className="absolute inset-0 animate-mesh opacity-20 pointer-events-none"></div>
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20">
                        <div className="space-y-12">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-2xl">
                                    {school.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-white uppercase tracking-tighter italic">{school.name}</h4>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Excellence Defined</p>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="flex items-center gap-6">
                                    <MapPinIcon className="w-6 h-6 text-white/40" />
                                    <span className="text-white/60 font-bold uppercase text-xs tracking-widest">{school.subCounty || 'Regional Campus'}, {school.constituency || 'Headquarters'}</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <PhoneIcon className="w-6 h-6 text-white/40" />
                                    <span className="text-white/60 font-bold uppercase text-xs tracking-widest">{school.phoneNumber}</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <GlobeAltIcon className="w-6 h-6 text-white/40" />
                                    <span className="text-white/60 font-bold uppercase text-xs tracking-widest">{school.email}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-2xl p-12 rounded-[4rem] border border-white/10 flex flex-col justify-center items-center text-center space-y-8">
                             <h5 className="text-white text-3xl font-black uppercase italic tracking-tighter">Stay Synchronized</h5>
                             <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Join 500+ parents receiving weekly academic insights</p>
                             <div className="w-full flex">
                                 <input className="flex-1 bg-white/10 border-none rounded-l-2xl px-6 font-bold text-white outline-none focus:ring-2 ring-indigo-500/50" placeholder="Academy Email..." />
                                 <button className="bg-white text-slate-900 px-8 py-5 rounded-r-2xl font-black uppercase text-[10px] tracking-widest">Subscribe</button>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="py-12 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-slate-200 dark:border-slate-800 mt-12 opacity-40">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">© {new Date().getFullYear()} {school.name}. Empowered by EduAI Global.</p>
                    <div className="flex gap-8">
                        {['Privacy', 'Registry', 'Compliance'].map(link => (
                            <span key={link} className="text-[9px] font-black uppercase tracking-[0.3em] cursor-pointer hover:text-indigo-500">{link}</span>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};
