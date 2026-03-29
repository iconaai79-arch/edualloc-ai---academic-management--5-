import React, { useState, useEffect } from 'react';
import { ChurchSacrament, ChurchFastingPeriod, ChurchSaintDay } from '../../../types';
import { CrossIcon as Cross } from '../../icons/CrossIcon';
import { UserGroupIcon as Users } from '../../icons/UserGroupIcon';
import { HeartIcon as Heart } from '../../icons/HeartIcon';
import { CalendarDaysIcon as Calendar } from '../../icons/CalendarDaysIcon';
import { PlusIcon as Plus } from '../../icons/PlusIcon';
import { BookOpenIcon as BookOpen } from '../../icons/BookOpenIcon';
import { ClockIcon as Clock } from '../../icons/ClockIcon';
import { DocumentTextIcon as FileText } from '../../icons/DocumentTextIcon';
import { CheckBadgeIcon as ShieldCheck } from '../../icons/CheckBadgeIcon';
import { SunIcon as Sun } from '../../icons/SunIcon';
import { MoonIcon as Moon } from '../../icons/MoonIcon';
import { SparklesIcon as Sparkles } from '../../icons/SparklesIcon';
import { FunnelIcon as Filter } from '../../icons/FunnelIcon';
import { ChevronRightIcon as ChevronRight } from '../../icons/ChevronRightIcon';
import { InformationCircleIcon as Info } from '../../icons/InformationCircleIcon';
import { useChurch } from '../ChurchDenominationProvider';
import { apiService } from '../../../services/apiService';

export const OrthodoxView: React.FC = () => {
    const { currentChurch } = useChurch();
    const [activeTab, setActiveTab] = useState<'mysteries' | 'fasting' | 'saints'>('mysteries');
    const [mysteries, setMysteries] = useState<ChurchSacrament[]>([]);
    const [fastingPeriods, setFastingPeriods] = useState<ChurchFastingPeriod[]>([]);
    const [saintDays, setSaintDays] = useState<ChurchSaintDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentChurch?.id) return;
            setIsLoading(true);
            try {
                const [sacraments, fasts, saints] = await Promise.all([
                    apiService.fetchChurchSacraments(currentChurch.id),
                    apiService.fetchChurchFastingPeriods(currentChurch.id),
                    apiService.fetchChurchSaintDays(currentChurch.id)
                ]);
                setMysteries(sacraments);
                setFastingPeriods(fasts);
                setSaintDays(saints);
            } catch (error) {
                console.error("Error fetching orthodox data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentChurch]);

    return (
        <div className="orthodox-view animate-in fade-in duration-700">
            {/* Orthodox Header */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 scale-150">
                    <Cross className="w-80 h-80 text-amber-500" />
                </div>
                <div className="p-6 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-inner group transition-all hover:bg-white/10">
                    <Cross className="w-12 h-12 text-amber-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-grow text-center md:text-left">
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none mb-3">Orthodox Life & Liturgy</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.4em]">Ancient Faith • Holy Tradition • Living Mystery</p>
                </div>
                <div className="bg-amber-500/10 backdrop-blur-md px-8 py-4 rounded-3xl border border-amber-500/20 text-center">
                    <span className="block text-[10px] font-black uppercase text-amber-500 mb-1">Current Cycle</span>
                    <span className="text-xl font-black text-white">Great Lent</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 bg-slate-100 dark:bg-slate-800/20 p-1.5 rounded-[2rem] w-fit border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                <TabButton 
                    active={activeTab === 'mysteries'} 
                    onClick={() => setActiveTab('mysteries')} 
                    icon={<ShieldCheck className="w-4 h-4" />} 
                    label="Holy Mysteries" 
                />
                <TabButton 
                    active={activeTab === 'fasting'} 
                    onClick={() => setActiveTab('fasting')} 
                    icon={<Moon className="w-4 h-4" />} 
                    label="Fasting Calendar" 
                />
                <TabButton 
                    active={activeTab === 'saints'} 
                    onClick={() => setActiveTab('saints')} 
                    icon={<Sun className="w-4 h-4" />} 
                    label="Saint Days" 
                />
            </div>

            {/* Tab Content */}
            <div className="tab-content transition-all duration-500">
                {activeTab === 'mysteries' && <MysteriesPanel mysteries={mysteries} />}
                {activeTab === 'fasting' && <FastingPanel fasts={fastingPeriods} />}
                {activeTab === 'saints' && <SaintsPanel saints={saintDays} />}
            </div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 px-8 py-4 rounded-3xl transition-all font-black text-[11px] uppercase tracking-widest ${
            active ? 'bg-slate-900 text-amber-500 shadow-2xl scale-105 z-10 border border-slate-800' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
    >
        {icon}
        {label}
    </button>
);

const MysteriesPanel: React.FC<{ mysteries: ChurchSacrament[] }> = ({ mysteries }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Registry of Mysteries</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Spiritual milestones of the faithful</p>
                </div>
                <button className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">
                    <Plus className="w-4 h-4" />
                    Record Mystery
                </button>
            </div>
            <div className="space-y-4">
                {mysteries.length > 0 ? mysteries.map(m => (
                    <MysteryRow key={m.id} name={m.memberId} type={m.sacramentType} date={new Date(m.date).toLocaleDateString()} officiant={m.officiantName} />
                )) : (
                    <>
                        <MysteryRow name="Athanasius Mwangi" type="Baptism & Chrismation" date="2024-03-20" officiant="Fr. Seraphim" />
                        <MysteryRow name="Marina Wairimu" type="Marriage" date="2024-03-15" officiant="Fr. Joachim" />
                        <MysteryRow name="Gregory Kamau" type="Chrismation" date="2024-03-10" officiant="Fr. Seraphim" />
                    </>
                )}
            </div>
        </div>
        <div className="space-y-8">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-[2.5rem] p-10 border border-amber-100 dark:border-slate-800 shadow-sm group">
                <BookOpen className="w-12 h-12 text-amber-600 mb-8 group-hover:scale-110 transition-transform" />
                <h4 className="text-xl font-black tracking-tighter uppercase mb-4 text-slate-900 dark:text-white">Sacramental Archive</h4>
                <p className="text-amber-800/60 dark:text-slate-400 text-xs leading-relaxed mb-8">
                    Maintain permanent records of spiritual initiation and growth within the Holy Orthodox Church.
                </p>
                <div className="space-y-3">
                    <StatRow label="Baptisms" value={154} />
                    <StatRow label="Marriages" value={28} />
                    <StatRow label="Ordinations" value={3} />
                </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-16 translate-x-16"></div>
                <Sparkles className="w-8 h-8 text-amber-500 mb-6" />
                <h4 className="text-lg font-black uppercase tracking-tight mb-2">Iconography Registry</h4>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-6">Track blessed icons and relics</p>
                <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
                    Access Ledger
                </button>
            </div>
        </div>
    </div>
);

const StatRow: React.FC<{ label: string, value: number }> = ({ label, value }) => (
    <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-amber-100/50 dark:border-slate-700">
        <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-500 tracking-widest">{label}</span>
        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</span>
    </div>
);

const FastingPanel: React.FC<{ fasts: ChurchFastingPeriod[] }> = ({ fasts }) => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-900 dark:bg-black rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-10 rotate-45 scale-150">
                <Moon className="w-64 h-64 text-amber-500" />
            </div>
            <div className="max-w-2xl relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <span className="px-4 py-1.5 bg-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-glow">Active Period</span>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Lenten Cycle</span>
                </div>
                <h3 className="text-5xl font-black tracking-tighter uppercase mb-6 leading-tight">Great Lent <br /><span className="text-amber-500 drop-shadow-lg">Fast of the Icons</span></h3>
                <p className="text-slate-400 text-sm mb-10 leading-relaxed max-w-lg">
                    A period of spiritual preparation through prayer and fasting. 
                    Deepen your spiritual journey through liturgical discipline and ascetic practice.
                </p>
                <div className="flex flex-wrap gap-12 p-8 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 w-fit">
                    <div>
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Duration</span>
                        <span className="text-2xl font-black tracking-tighter">40 Days + Week of Passion</span>
                    </div>
                    <div className="w-[1px] bg-white/10 hidden sm:block"></div>
                    <div>
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Days Remaining</span>
                        <span className="text-2xl font-black tracking-tighter text-amber-500">32 Days</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {fasts.length > 0 ? fasts.map(f => (
                <FastingCard key={f.id} name={f.name} period={`${f.startDate} - ${f.endDate}`} level="Moderate" description={f.rules} />
            )) : (
                <>
                    <FastingCard name="Apostles Fast" period="June 24 - July 12" level="Moderate" description="Following the Sunday of All Saints" />
                    <FastingCard name="Dormition Fast" period="August 1 - August 15" level="Strict" description="In honor of the Ever-Virgin Mary" />
                    <FastingCard name="Nativity Fast" period="Nov 15 - Dec 24" level="Moderate" description="Preparation for Christ's birth" />
                </>
            )}
        </div>
    </div>
);

const SaintsPanel: React.FC<{ saints: ChurchSaintDay[] }> = ({ saints }) => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full -translate-y-20 translate-x-20"></div>
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Daily Commemorations</h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Intercessors of the Universal Church</p>
                    </div>
                    <div className="flex gap-2">
                         <button className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="space-y-4">
                    {saints.length > 0 ? saints.map(s => (
                        <SaintRow key={s.id} name={s.saintName} date={s.celebrationDate} color={s.liturgicalColor} description={s.description || ''} />
                    )) : (
                        <>
                            <SaintRow name="St. Mary of Egypt" date="Mar 20" color="Purple" description="Ascetic who lived in Jordan desert. Example of repentance." />
                            <SaintRow name="St. Gregory Palamas" date="Mar 21" color="Purple" description="Defender of Hesychasm and the Uncreated Light." />
                            <SaintRow name="St. Basil the Great" date="Jan 01" color="Gold" description="Great Hierarch, Teacher, and Father of the Church." />
                        </>
                    )}
                </div>
            </div>
        </div>
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm text-center group">
                <Sun className="w-16 h-16 text-amber-500 mx-auto mb-8 group-hover:rotate-90 transition-transform duration-700" />
                <h4 className="text-xl font-black tracking-tighter uppercase mb-2 text-slate-900 dark:text-white">Name Day Center</h4>
                <p className="text-slate-400 text-[10px] leading-relaxed mb-10 font-bold uppercase tracking-widest">
                    Celebrating the patron saints of our faithful community.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                        <span className="block text-[8px] font-black text-slate-400 uppercase mb-2">Today</span>
                        <span className="text-2xl font-black text-amber-600 tracking-tighter">3</span>
                    </div>
                    <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                        <span className="block text-[8px] font-black text-slate-400 uppercase mb-2">Next 7d</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">12</span>
                    </div>
                </div>
                <button className="w-full py-4 bg-slate-900 dark:bg-black text-amber-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">
                    Member Registry
                </button>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
                <Info className="w-8 h-8 text-amber-500 mb-6" />
                <h4 className="text-lg font-black uppercase tracking-tight mb-2">Liturgical Guide</h4>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest leading-relaxed">
                    Access rubrics and service orders for upcoming feasts.
                </p>
                <button className="mt-8 flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                    Open Guide <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
);

const MysteryRow: React.FC<{ name: string, type: string, date: string, officiant: string }> = ({ name, type, date, officiant }) => (
    <div className="group p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-between border border-transparent hover:border-amber-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm hover:shadow-xl">
        <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover:bg-amber-500 group-hover:text-slate-900 transition-all transform group-hover:scale-110">
                <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors tracking-tight">{name}</h4>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{type}</span>
                </div>
            </div>
        </div>
        <div className="text-right flex items-center gap-8">
            <div className="hidden md:block">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Priest / Date</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 italic">{officiant} • {date}</span>
            </div>
            <button className="p-3 bg-white dark:bg-slate-700 rounded-2xl text-slate-300 group-hover:text-amber-500 transition-colors">
                <FileText className="w-5 h-5" />
            </button>
        </div>
    </div>
);

const FastingCard: React.FC<{ name: string, period: string, level: string, description?: string }> = ({ name, period, level, description }) => (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm hover:shadow-2xl hover:shadow-amber-500/10 transition-all group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
            <Moon className="w-16 h-16" />
        </div>
        <div className="flex justify-between items-start mb-8">
            <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-slate-400 group-hover:bg-amber-500 group-hover:text-slate-900 transition-all shadow-inner group-hover:scale-110">
                <Moon className="w-8 h-8" />
            </div>
            <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                level === 'Strict' ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'
            }`}>
                {level} Fast
            </span>
        </div>
        <h4 className="text-2xl font-black tracking-tighter uppercase mb-2 text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">{name}</h4>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">{period}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-2 border-slate-100 dark:border-slate-800 pl-4">
            {description}
        </p>
    </div>
);

const SaintRow: React.FC<{ name: string, date: string, color: string, description: string }> = ({ name, date, color, description }) => (
    <div className="flex items-center gap-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group shadow-sm hover:shadow-xl border border-transparent hover:border-amber-100/50">
        <div className="text-center min-w-[70px] p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
            <span className="block text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Feast</span>
            <span className="text-base font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors uppercase">{date}</span>
        </div>
        <div className="flex-grow">
            <div className="flex items-center gap-3 mb-1">
                <div className="w-2.5 h-2.5 rounded-full shadow-glow" style={{ backgroundColor: color === 'Gold' ? '#fbbf24' : color === 'Purple' ? '#a855f7' : '#cbd5e1' }}></div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-none group-hover:text-amber-600 transition-colors tracking-tight">{name}</h4>
            </div>
            <p className="text-xs font-medium text-slate-400 tracking-wide line-clamp-1 group-hover:text-slate-500 transition-colors">{description}</p>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-300 group-hover:text-amber-500 transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4">
            <Plus className="w-5 h-5" />
        </div>
    </div>
);
