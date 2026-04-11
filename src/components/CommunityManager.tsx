
import React, { useState, useMemo } from 'react';
import { 
    Users, 
    Home, 
    Heart, 
    Globe, 
    CircleDollarSign,
    Calendar,
    ShieldCheck,
    MessageSquare,
    FileText,
    Plus,
    RotateCw,
    MapPin,
    Ghost,
    History,
    Network,
    Library,
    Mic,
    Image as ImageIcon,
    TreePalm,
    CalendarDays as CalendarDaysIcon,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import type { Institution, User } from '../types';

interface CommunityManagerProps {
    currentInstitution: Institution;
    users: User[];
}

export const CommunityManager: React.FC<CommunityManagerProps> = ({ currentInstitution, users }) => {
    const category = currentInstitution.category || 'NGO/Foundation';
    
    // Determine initial view based on category
    const getInitialTab = () => {
        if (category.includes('Chama')) return 'savings';
        if (category.includes('Estate')) return 'residences';
        if (category.includes('NGO')) return 'social';
        if (category.includes('Family') || category.includes('Heritage')) return 'heritage';
        return 'overview';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [searchTerm, setSearchTerm] = useState('');

    const stats = [
        { name: 'Active Members', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { name: 'Collections (MTD)', value: 'KES 428,500', icon: CircleDollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        { name: 'Open Projects', value: '12', icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50' },
        { name: 'Pending Requests', value: '8', icon: RotateCw, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    const renderOverview = () => (
        <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.name}</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-indigo-600" />
                        Community Bulletin
                    </h3>
                    <div className="space-y-4">
                        {[
                            { title: 'Annual General Meeting', date: 'Oct 24, 2024', type: 'Event' },
                            { title: 'Water Tank Maintenance', date: 'Oct 20, 2024', type: 'Maintenance' },
                            { title: 'New Security Protocol', date: 'Oct 18, 2024', type: 'Security' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all cursor-pointer">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                                    <p className="text-xs text-slate-400 font-medium">{item.date}</p>
                                </div>
                                <span className="text-[9px] font-black uppercase px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-slate-500 tracking-widest">
                                    {item.type}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map/Location Preview */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative min-h-[300px]">
                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        <Home className="w-16 h-16 text-indigo-600 mb-4 animate-pulse" />
                        <span className="ml-3 font-black text-slate-400 uppercase tracking-widest text-xs">Community Map Loading...</span>
                    </div>
                    <div className="absolute top-8 left-8 p-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-2xl shadow-xl z-10 border border-white/20">
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Live Operations</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">Active Project Sites</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSavings = () => (
        <div className="animate-fade-in bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Savings & Contributions</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Track member deposits, loans, and merry-go-round cycles.</p>
                </div>
                <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold active:scale-95 shadow-lg shadow-green-100 dark:shadow-none">
                    <CircleDollarSign className="w-5 h-5" />
                    New Deposit
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-blue-600 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                    <CircleDollarSign className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Total Savings Pool</p>
                    <h4 className="text-3xl font-black mt-1 tracking-tighter uppercase">KES 1,250,000</h4>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1 rounded-full">
                        <RotateCw className="w-3 h-3" />
                        +12% from last month
                    </div>
                </div>
                <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Reserve Fund</p>
                    <h4 className="text-3xl font-black mt-1 tracking-tighter uppercase text-slate-800 dark:text-white">KES 45,000</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-2">Available for immediate withdrawal</p>
                </div>
                <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Active Merry-Go-Round</p>
                    <h4 className="text-3xl font-black mt-1 tracking-tighter uppercase text-slate-800 dark:text-white">Batch #42</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-2">Next Payout: Oct 30 (Jane Smith)</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50">
                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Member Name</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Deposits</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Loan Balance</th>
                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                            <th className="px-8 py-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {users.slice(0, 5).map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white uppercase tracking-tight">{user.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{user.staffId || 'MBR-00' + user.id.slice(0,3)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 font-black text-slate-600 dark:text-slate-300">KES 45,000</td>
                                <td className="px-8 py-6 font-black text-red-500">KES 12,000</td>
                                <td className="px-8 py-6">
                                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest">Active</span>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <button className="p-3 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-2xl text-indigo-600 transition-all">
                                        <RotateCw className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderResidences = () => (
        <div className="animate-fade-in space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <Home className="w-8 h-8 text-indigo-600" />
                            Estate Management
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">Manage residency logs, service charges, and security protocols.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-bold active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none">
                            <ShieldCheck className="w-5 h-5" />
                            Create Security Clear
                        </button>
                        <button className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl hover:bg-slate-50 transition-all font-bold active:scale-95">
                            Billing
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Units', value: '142', icon: Home, color: 'text-blue-500' },
                        { label: 'Occupancy', value: '94%', icon: Users, color: 'text-green-500' },
                        { label: 'Unpaid Dues', value: 'KES 28k', icon: CircleDollarSign, color: 'text-red-500' },
                        { label: 'Reports', value: '0 NEW', icon: FileText, color: 'text-indigo-500' }
                    ].map((stat, i) => (
                        <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <h4 className="text-lg font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight">Recent Visitors / Gate Logs</h4>
                <div className="space-y-4">
                    {[
                        { guest: 'Sarah Johnson', house: 'C12', time: '14:20', status: 'In' },
                        { guest: 'Michael Chen (Delivery)', house: 'B08', time: '13:45', status: 'Out' },
                        { guest: 'Taxi - KCB 001Z', house: 'A22', time: '13:10', status: 'In' }
                    ].map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center">
                                    <Home className="w-5 h-5 text-blue-500 mb-3" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{log.guest}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">House {log.house} • {log.time}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.status === 'In' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {log.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderSocial = () => (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Heart className="w-8 h-8 text-red-500" />
                        Foundation & Social Impact
                    </h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Beneficiary mapping, relief distribution, and project tracking.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Projects */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="text-lg font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight">Active Relief Projects</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { name: 'School Lunch Program', progress: 85, color: 'bg-indigo-600', beneficiaries: 1200 },
                                { name: 'Health Awareness Camp', progress: 40, color: 'bg-green-600', beneficiaries: 350 },
                                { name: 'Clean Water Initiative', progress: 65, color: 'bg-blue-600', beneficiaries: 890 },
                            ].map((project, i) => (
                                <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                    <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1">{project.name}</h5>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{project.beneficiaries} Beneficiaries</p>
                                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${project.color}`} style={{ width: `${project.progress}%` }}></div>
                                    </div>
                                    <div className="mt-3 flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                                        <span>Progress</span>
                                        <span>{project.progress}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Beneficiary Search */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-lg font-black mb-6 text-slate-800 dark:text-white uppercase tracking-tight">Beneficiary Lookup</h4>
                    <div className="relative mb-6">
                        <Plus className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 cursor-pointer" />
                        <input 
                            placeholder="Enter Name or ID" 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-bold placeholder:text-slate-300"
                        />
                    </div>
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Verified Beneficiaries</p>
                        {users.slice(0, 4).map((user, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-2xl border-b border-transparent">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate uppercase tracking-tight">{user.name}</p>
                                    <p className="text-[9px] text-slate-400 font-black uppercase">Verified ID: {user.id.slice(0, 6)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderHeritage = () => {
        const [heritageView, setHeritageView] = useState<'tree' | 'stories' | 'gallery' | 'announcements'>('tree');

        return (
            <div className="animate-fade-in space-y-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <TreePalm className="w-64 h-64" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
                        <div className="max-w-xl">
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-4">
                                <History className="w-10 h-10 text-amber-600" />
                                {heritageView === 'tree' ? 'Ancestry Map' : 
                                 heritageView === 'stories' ? 'Origin & Oral History' : 
                                 heritageView === 'gallery' ? 'Heritage Gallery' : 'Family Council'}
                            </h3>
                            <p className="text-slate-500 font-medium mt-2">
                                {heritageView === 'tree' ? 'Visualize your lineage and connect the branches of your family tree.' : 
                                 heritageView === 'stories' ? 'Document the stories of your origin, migration, and family achievements.' : 
                                 heritageView === 'gallery' ? 'Preserve the faces and places that define your family legacy.' : 'Coordinate family meetings, ceremonies, and important announcements.'}
                            </p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            {[
                                { id: 'tree', label: 'Tree', icon: Network },
                                { id: 'stories', label: 'Stories', icon: Library },
                                { id: 'gallery', label: 'Gallery', icon: ImageIcon },
                                { id: 'announcements', label: 'Council', icon: Ghost }
                            ].map((view) => (
                                <button
                                    key={view.id}
                                    onClick={() => setHeritageView(view.id as any)}
                                    className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${heritageView === view.id ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <view.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{view.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {heritageView === 'tree' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Visual Family Tree Preview */}
                        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden min-h-[500px] border-4 border-slate-800 shadow-2xl">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-full flex justify-between items-center mb-12">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Gen 1: Foundational Roots</p>
                                    <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Paternal</div>
                                        <div className="flex items-center gap-2 ml-4"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Maternal</div>
                                    </div>
                                </div>

                                {/* Interactive Tree Root Simulation */}
                                <div className="space-y-16 w-full max-w-2xl">
                                    <div className="flex flex-col items-center">
                                        <div className="p-4 bg-white/10 border-2 border-amber-500 rounded-2xl backdrop-blur-md text-center group cursor-pointer hover:bg-amber-500 transition-all">
                                            <p className="font-black text-sm uppercase tracking-tight group-hover:text-slate-900">Samuel Mwangi Sr.</p>
                                            <p className="text-[9px] font-black text-amber-400 uppercase group-hover:text-slate-800">1892 - 1968</p>
                                        </div>
                                        <div className="w-0.5 h-16 bg-gradient-to-b from-amber-500 to-indigo-500"></div>
                                        <div className="flex gap-20 items-start relative">
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-0.5 bg-indigo-500"></div>
                                            <div className="flex flex-col items-center">
                                                <div className="w-0.5 h-8 bg-indigo-500"></div>
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm text-center transition-all hover:bg-white/10 select-none">
                                                    <p className="font-bold text-xs uppercase tracking-tight">John Mwangi</p>
                                                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Son</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <div className="w-0.5 h-8 bg-indigo-500"></div>
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm text-center border-t-4 border-t-amber-500 animate-pulse transition-all hover:scale-105 active:scale-95 cursor-pointer">
                                                    <p className="font-bold text-xs uppercase tracking-tight">Grace Wamboi</p>
                                                    <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Daughter</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-12 text-center text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">
                                    Hold & Drag to Explore Lineage
                                </div>
                            </div>
                        </div>

                        {/* Heritage Status */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm self-start">
                            <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-8">Tree Health</h4>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <span>Verified Members</span>
                                    <span className="text-amber-600">42 Souls</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <span>Documented Generations</span>
                                    <span className="text-blue-600">4 Generations</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                    <div className="w-[65%] h-full bg-amber-500"></div>
                                </div>
                                <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl shadow-slate-200 dark:shadow-none">
                                    Invite Family Admins
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {heritageView === 'stories' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm min-h-[400px]">
                            <div className="flex justify-between items-center mb-10">
                                <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Historical Origins</h4>
                                <button className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {[
                                    { title: 'The Great Migration from Abyssinia', date: 'Circa 1780', text: 'Our elders tell of a journey through the mountains, carrying nothing but seeds and hope...', author: 'Mzee Mwangi' },
                                    { title: 'The First Ancestral Farm', date: 'Jan 12, 1920', text: 'Samuel Sr. acquired the first 40 acres in the highlands, where the black soil yields gold...', author: 'Grace W.' }
                                ].map((story, i) => (
                                    <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-transparent hover:border-amber-100 transition-all cursor-pointer">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">{story.title}</h5>
                                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{story.date}</span>
                                        </div>
                                        <p className="text-slate-500 text-sm line-clamp-2 italic mb-4">"{story.text}"</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Oral Historian: {story.author}</span>
                                            <ArrowRight className="w-4 h-4 text-slate-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent"></div>
                            <div className="relative z-10 text-center animate-pulse">
                                <Mic className="w-20 h-20 text-amber-500 mx-auto mb-6 opacity-50" />
                                <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Voice of Elders</h4>
                                <p className="text-slate-400 text-sm uppercase font-bold tracking-[0.2em]">Record Oral Testimony</p>
                            </div>
                        </div>
                    </div>
                )}

                {heritageView === 'gallery' && (
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Heirloom Gallery</h4>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Preserve every smile & milestone</p>
                                </div>
                                <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-95">
                                    <ImageIcon className="w-5 h-5" />
                                    Upload Photos
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-900 rounded-3xl overflow-hidden group relative cursor-pointer">
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-white scale-0 group-hover:scale-100 transition-transform duration-500" />
                                        </div>
                                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 animate-pulse"></div>
                                        <div className="absolute bottom-4 left-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Heritage Milestone {i}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {heritageView === 'announcements' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Announcements Feed */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-8">Family Proclamations</h4>
                                <div className="space-y-6">
                                    {[
                                        { title: 'Annual Family Reunion 2026', type: 'CEREMONY', date: 'Aug 15', detail: 'Hosted at the Ancestral Farm. All branches requested to RSVP.' },
                                        { title: 'Heritage Portal Update', type: 'ADMIN', date: 'Today', detail: 'New migration maps for the Western branches added.' }
                                    ].map((post, i) => (
                                        <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-transparent hover:border-slate-100 transition-all flex gap-6">
                                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
                                                <span className="text-xs font-black text-amber-600 uppercase tracking-tighter">{post.date.split(' ')[0]}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.date.split(' ')[1] || ''}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full tracking-widest">{post.type}</span>
                                                    <h5 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">{post.title}</h5>
                                                </div>
                                                <p className="text-slate-500 text-xs leading-relaxed">{post.detail}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Calendar Quick View */}
                        <div className="space-y-6">
                            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <CalendarDaysIcon className="w-20 h-20" />
                                </div>
                                <h4 className="text-lg font-black uppercase tracking-tighter mb-6 relative z-10 flex items-center gap-2">
                                    Council Meetings
                                </h4>
                                <div className="space-y-4 relative z-10">
                                    <div className="p-4 bg-white/10 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Next Meeting</p>
                                        <p className="text-sm font-bold mt-1">Heritage Committee Sync</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Zoom • Saturday, 4PM</p>
                                    </div>
                                    <button className="w-full py-3 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                                        Join Council Link
                                    </button>
                                </div>
                            </div>

                            <button className="w-full p-8 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] text-slate-300 font-black uppercase tracking-widest text-[10px] hover:border-amber-200 hover:text-amber-500 transition-all flex flex-col items-center gap-4">
                                <Plus className="w-8 h-8" />
                                Create Announcement
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-4xl font-black flex items-center gap-3 text-slate-800 dark:text-white uppercase tracking-tighter">
                        <Users className="w-12 h-12 text-indigo-600" />
                        {category} Gateway
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">Professional dashboard for community-led organizations and welfare programs.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Overview
                    </button>
                    {(category.includes('Chama') || category.includes('Savings')) && (
                        <button
                            onClick={() => setActiveTab('savings')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'savings' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Savings Hub
                        </button>
                    )}
                    {category.includes('Estate') && (
                        <button
                            onClick={() => setActiveTab('residences')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'residences' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Estate Ops
                        </button>
                    )}
                    {(category.includes('NGO') || category.includes('Welfare')) && (
                        <button
                            onClick={() => setActiveTab('social')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'social' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Social Impact
                        </button>
                    )}
                    {(category.includes('Family') || category.includes('Heritage')) && (
                        <button
                            onClick={() => setActiveTab('heritage')}
                            className={`px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'heritage' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Family Tree
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-8 transition-all duration-300">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'savings' && renderSavings()}
                {activeTab === 'residences' && renderResidences()}
                {activeTab === 'social' && renderSocial()}
                {activeTab === 'heritage' && renderHeritage()}
            </div>
        </div>
    );
};
