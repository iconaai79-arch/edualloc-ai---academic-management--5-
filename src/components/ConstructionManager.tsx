
import React, { useState, useEffect } from 'react';
import { 
    Construction, 
    Building2, 
    HardHat, 
    Truck, 
    Users, 
    Calendar, 
    CreditCard, 
    CheckCircle2, 
    Clock, 
    Plus, 
    Camera, 
    MapPin, 
    TrendingUp, 
    Search, 
    ChevronRight,
    ArrowRight,
    AlertCircle,
    FileText,
    GanttChart
} from 'lucide-react';
import { Institution, User } from '../types';
import { apiService } from '../services/apiService';

interface ConstructionManagerProps {
    currentInstitution: Institution;
    users: User[];
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

export const ConstructionManager: React.FC<ConstructionManagerProps> = ({ currentInstitution, users }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'resources' | 'financials' | 'documents'>('overview');
    const [projects, setProjects] = useState<Project[]>([]);
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newProject, setNewProject] = useState({
        name: '',
        clientName: '',
        budget: '',
        location: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        images: [] as string[]
    });

    const loadProjects = async () => {
        const records = await apiService.fetchModuleRecords('construction_projects', currentInstitution.id);
        setProjects(records);
    };

    useEffect(() => {
        loadProjects();
    }, [currentInstitution.id]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await apiService.uploadToShowcaseCpanel(file, currentInstitution.id);
            if (result.success) {
                setNewProject(prev => ({ ...prev, images: [...prev.images, result.url] }));
            }
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProject = async () => {
        const payload = {
            ...newProject,
            id: `proj_${Date.now()}`,
            institutionId: currentInstitution.id,
            budget: Number(newProject.budget),
            completion: 0,
            status: 'active'
        };

        await apiService.saveModuleRecord('construction_projects', payload);
        setIsAddingProject(false);
        setNewProject({ 
            name: '', clientName: '', budget: '', location: '', description: '', 
            startDate: new Date().toISOString().split('T')[0], endDate: '', images: [] 
        });
        loadProjects();
    };

    const renderOverview = () => {
        const meta = [
            { label: 'Active Sites', value: projects.filter(p => p.status === 'active').length, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Total Labor', value: '1,240', icon: HardHat, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Budget Managed', value: 'KES 420M', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Eq. Utilization', value: '78%', icon: Truck, color: 'text-rose-600', bg: 'bg-rose-50' },
        ];

        return (
            <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {meta.map((s, i) => (
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Interactive Project Progress */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Live Project Tracker</h4>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Real-time status of major building sites</p>
                                </div>
                                <button className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">
                                    <GanttChart className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {projects.slice(0, 3).map((p) => (
                                    <div key={p.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-50 dark:border-white/5 group hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black">
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{p.name}</h5>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.clientName} • {p.location}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <span>Completion Progress</span>
                                                <span className="text-indigo-600">{p.completion}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${p.completion}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Site Safety Alert */}
                        <div className="bg-rose-600 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                            <AlertCircle className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
                            <div className="relative z-10">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Urgent Safety</span>
                                <h4 className="text-2xl font-black uppercase tracking-tighter mt-4 leading-none">Safety Compliance Audit</h4>
                                <p className="text-rose-100 text-xs mt-3 leading-relaxed">Zone B requires immediate reinforcement inspection before pouring concrete.</p>
                                <button className="w-full mt-8 py-4 bg-white text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
                                    Initiate Audit
                                </button>
                            </div>
                        </div>

                        {/* Inventory Quick Access */}
                        <div className="bg-slate-900 rounded-[3rem] p-8 text-white">
                            <h4 className="text-lg font-black uppercase tracking-tight mb-6">Stock Shortages</h4>
                            <div className="space-y-4">
                                {[
                                    { name: 'Premix Cement', unit: 'Bags', count: 12, status: 'Critically Low' },
                                    { name: '12mm Rebar', unit: 'Tons', count: 0.5, status: 'Low' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight">{item.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.count} {item.unit}</p>
                                        </div>
                                        <span className="text-[8px] font-black bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full uppercase tracking-widest">{item.status}</span>
                                    </div>
                                ))}
                                <button className="w-full py-4 text-slate-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                                    View All Logistics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderProjects = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Project Portfolio</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Manage and track all structural developments</p>
                </div>
                <button 
                    onClick={() => setIsAddingProject(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-slate-900 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Start New Project
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.length === 0 ? (
                    <div className="col-span-full py-32 bg-slate-50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
                        <Construction className="w-20 h-20 mx-auto mb-6 text-slate-300 opacity-20" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No active projects found. Initiate your first build above.</p>
                    </div>
                ) : projects.map((p) => (
                    <div key={p.id} className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden group hover:shadow-2xl transition-all flex flex-col">
                        <div className="h-56 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
                            {p.images && p.images.length > 0 ? (
                                <img loading="lazy" src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                    <Building2 className="w-16 h-16" />
                                </div>
                            )}
                            <div className="absolute top-6 left-6 z-10">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${p.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                                    {p.status}
                                </span>
                            </div>
                        </div>
                        <div className="p-8 flex-1 flex flex-col justify-between">
                            <div>
                                <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none mb-3">{p.name}</h4>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-600" /> {p.location}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-50 dark:border-white/5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Budget</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-white">KES {(p.budget/1000000).toFixed(1)}M</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-50 dark:border-white/5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Deadline</p>
                                        <p className="text-sm font-black text-slate-800 dark:text-white">{p.endDate ? new Date(p.endDate).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : '---'}</p>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                                Project Portal <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Project Modal */}
            {isAddingProject && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setIsAddingProject(false)}></div>
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-12">
                            <h4 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white mb-2 leading-none">Initiate <span className="text-indigo-600 italic">Project</span></h4>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Define structural scope and logistics</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block italic underline decoration-indigo-200">Project Title</label>
                                    <input type="text" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="e.g. Upperhill Skyscraper" className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 ring-indigo-500/10" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block italic underline decoration-indigo-200">Total Budget (KES)</label>
                                    <input type="number" value={newProject.budget} onChange={e => setNewProject({...newProject, budget: e.target.value})} placeholder="e.g. 120000000" className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 ring-indigo-500/10" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block italic underline decoration-indigo-200">Client Name</label>
                                    <input type="text" value={newProject.clientName} onChange={e => setNewProject({...newProject, clientName: e.target.value})} placeholder="e.g. Safaricom PLC" className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 ring-indigo-500/10" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-2 block italic underline decoration-indigo-200">Site Location</label>
                                    <input type="text" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} placeholder="e.g. Nairobi, Upperhill" className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 ring-indigo-500/10" />
                                </div>
                            </div>

                            <div className="mb-8">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-4 block italic underline decoration-indigo-200">Progress Feed (Progress Photos to cPanel)</label>
                                <div className="grid grid-cols-4 gap-4">
                                    {newProject.images.map((img, idx) => (
                                        <div key={idx} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border-2 border-slate-50 dark:border-white/5 relative group shadow-sm">
                                            <img loading="lazy" src={img} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    <label className="aspect-square border-4 border-dotted border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-600 cursor-pointer transition-all">
                                        {isUploading ? <Clock className="animate-spin" /> : <Camera className="w-8 h-8" />}
                                        <input type="file" onChange={handlePhotoUpload} className="hidden" accept="image/*" disabled={isUploading} />
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setIsAddingProject(false)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest">Abort</button>
                                <button onClick={handleSaveProject} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                                    Confirm & Deploy <CheckCircle2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-slate-200 dark:shadow-none border border-white/5">
                        <Construction className="w-10 h-10" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.4em] mb-1">Infrastructure Command</p>
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                            {currentInstitution.name}
                        </h2>
                    </div>
                </div>

                <div className="flex bg-white dark:bg-slate-800 p-2 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    {[
                        { id: 'overview', label: 'Dashboard', icon: TrendingUp },
                        { id: 'projects', label: 'Sites', icon: Building2 },
                        { id: 'resources', label: 'Labor', icon: HardHat },
                        { id: 'financials', label: 'Budgets', icon: CreditCard },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="transition-all duration-300">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'projects' && renderProjects()}
                {activeTab === 'resources' && (
                    <div className="bg-white dark:bg-slate-800 p-24 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center text-slate-400">
                        <Users className="w-20 h-20 mx-auto mb-6 opacity-10" />
                        <p className="font-black uppercase tracking-widest text-sm">Labor Intelligence Module Syncing...</p>
                    </div>
                )}
                {activeTab === 'financials' && (
                    <div className="bg-white dark:bg-slate-800 p-24 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center text-slate-400">
                        <CreditCard className="w-20 h-20 mx-auto mb-6 opacity-10" />
                        <p className="font-black uppercase tracking-widest text-sm">Financial Auditing Vault Syncing...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

