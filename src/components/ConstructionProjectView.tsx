
import React, { useState, useEffect } from 'react';
import { 
    Construction, 
    Building2, 
    HardHat, 
    Calendar, 
    MapPin, 
    ChevronRight, 
    Camera, 
    ShieldCheck, 
    Clock, 
    FileText, 
    Activity,
    Users,
    MessageCircle,
    ArrowRight
} from 'lucide-react';
import { Institution } from '../types';
import { apiService } from '../services/apiService';

interface ConstructionProjectViewProps {
    institutionId: string;
}

interface Project {
    id: string;
    name: string;
    clientName: string;
    budget: number;
    completion: number;
    status: 'planning' | 'active' | 'on_hold' | 'completed';
    startDate: string;
    endDate: string;
    location: string;
    description: string;
    images: string[];
}

export const ConstructionProjectView: React.FC<ConstructionProjectViewProps> = ({ institutionId }) => {
    const [tenant, setTenant] = useState<Institution | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    useEffect(() => {
        const loadStore = async () => {
            setLoading(true);
            try {
                const insts = await apiService.fetchModuleRecords<Institution>('institutions');
                const resolvedTenant = insts.find(i => i.id === institutionId || i.slug === institutionId) || null;

                if (resolvedTenant) {
                    setTenant(resolvedTenant);
                    document.title = `${resolvedTenant.name} | Infrastructure Portfolio`;

                    const data = await apiService.fetchModuleRecords<Project>('construction_projects', resolvedTenant.id);
                    setProjects(data);
                }
            } catch (err) {
                console.error("Project View Load Error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadStore();
    }, [institutionId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-6 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Connecting to Command Hub...</p>
            </div>
        );
    }

    if (!tenant) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
            {/* Premium Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Construction className="w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{tenant.name}</h1>
                    </div>
                    <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all">
                        Client Login
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <div className="pt-40 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[60vh] bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/20 -z-10" />
                <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                        <Building2 className="w-3.5 h-3.5" /> Building the Future, Today
                    </div>
                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-8">
                        Precision <span className="text-indigo-600 italic">Infrastructure</span> <br /> Architecture
                    </h2>
                    <p className="max-w-2xl text-slate-400 text-sm font-medium leading-relaxed uppercase tracking-wide italic">
                        Explore our active structural developments and monitor real-time site progress across our national project portfolio.
                    </p>
                </div>
            </div>

            {/* Active Projects Grid */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((proj) => (
                        <div key={proj.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer" onClick={() => setSelectedProject(proj)}>
                            <div className="h-64 bg-slate-100 dark:bg-slate-800 relative">
                                {proj.images && proj.images.length > 0 ? (
                                    <img loading="lazy" src={proj.images[0]} alt={proj.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                        <Construction className="w-16 h-16" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent"></div>
                                <div className="absolute bottom-6 left-6 text-white">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Active Site</p>
                                    <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">{proj.name}</h4>
                                </div>
                                <div className="absolute top-6 right-6 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                                    {proj.completion}% Completed
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                                    <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-600" /> {proj.location}</div>
                                    <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-600" /> 2026 Batch</div>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed h-10 mb-8">{proj.description}</p>
                                <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex -space-x-2">
                                        {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Users className="w-4 h-4 text-slate-400" /></div>)}
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-[8px] font-black flex items-center justify-center">+12</div>
                                    </div>
                                    <button className="flex items-center gap-2 group/btn">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">View Progress</span>
                                        <ArrowRight className="w-4 h-4 text-indigo-600 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Project Modal (The Feed) */}
            {selectedProject && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" onClick={() => setSelectedProject(null)}></div>
                    <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500 max-h-[90vh]">
                        {/* Feed Column */}
                        <div className="flex-1 p-10 overflow-y-auto">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{selectedProject.name}</h3>
                                    <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-1">Real-Time Site Activity Feed</p>
                                </div>
                                <button onClick={() => setSelectedProject(null)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl text-slate-400 hover:text-red-500 transition-colors">
                                    X
                                </button>
                            </div>

                            <div className="space-y-12">
                                {selectedProject.images.length === 0 ? (
                                    <div className="py-20 text-center animate-pulse">
                                        <Camera className="w-16 h-16 mx-auto mb-6 opacity-10" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Awaiting Site Image Uplink...</p>
                                    </div>
                                ) : selectedProject.images.map((img, idx) => (
                                    <div key={idx} className="space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center"><Activity className="w-4 h-4 text-indigo-600" /></div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Site Entry #{idx + 1} • {new Date().toLocaleDateString()}</p>
                                        </div>
                                        <img loading="lazy" src={img} alt="Live Site Progress" className="w-full rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl" />
                                        <p className="text-xs text-slate-500 italic px-4 leading-relaxed font-medium capitalize">Progress Check: structural reinforcement ongoing at zone {idx + 1}.</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Specs Sidebar */}
                        <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800 p-10 flex flex-col justify-between border-l border-slate-100 dark:border-slate-700">
                            <div>
                                <div className="space-y-8">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Client Hub</p>
                                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedProject.clientName}</h4>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Build Duration</p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                                            <Clock className="w-4 h-4 text-indigo-600" /> {selectedProject.startDate} — {selectedProject.endDate || 'TBA'}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Certification</p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                                            <ShieldCheck className="w-4 h-4" /> ISO 9001 Compliant
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-12 space-y-4">
                                <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2">
                                    <FileText className="w-4 h-4" /> Final Blueprint
                                </button>
                                <button className="w-full py-5 bg-white text-indigo-600 border border-indigo-100 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                                    <MessageCircle className="w-4 h-4" /> Request Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

