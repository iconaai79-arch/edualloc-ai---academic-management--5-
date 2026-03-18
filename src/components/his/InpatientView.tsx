import React, { useState } from 'react';
import { 
    BedIcon, 
    PlusIcon, 
    ArrowPathIcon, 
    SearchIcon,
    ChevronRightIcon,
    UsersIcon,
    SparklesIcon,
    BuildingOfficeIcon
} from '../icons/index';

interface Ward {
    id: string;
    name: string;
    type: 'ICU' | 'General' | 'Maternity' | 'Pediatric';
    beds: number;
    occupied: number;
}

const MOCK_WARDS: Ward[] = [
    { id: 'w1', name: 'ICU Alpha', type: 'ICU', beds: 10, occupied: 8 },
    { id: 'w2', name: 'Maternity Wing', type: 'Maternity', beds: 20, occupied: 15 },
    { id: 'w3', name: 'General Ward B', type: 'General', beds: 40, occupied: 32 },
    { id: 'w4', name: 'Pediatric Unit', type: 'Pediatric', beds: 15, occupied: 10 },
];

interface InpatientViewProps {
    institutionId?: string;
    onAddWard?: () => void;
}

export const InpatientView: React.FC<InpatientViewProps> = ({ onAddWard }) => {
    const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Ward <span className="text-emerald-400">Inventory</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Real-time facility occupancy tracking</p>
                </div>
                <div className="flex gap-4">
                    <button className="glass-morphism px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                        <ArrowPathIcon className="w-4 h-4" /> Refresh
                    </button>
                    <button 
                        onClick={onAddWard}
                        className="bg-emerald-500 text-slate-950 px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                    >
                        <PlusIcon className="w-4 h-4" /> Add Ward
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {MOCK_WARDS.map(ward => (
                    <button 
                        key={ward.id}
                        onClick={() => setSelectedWard(ward)}
                        className={`glass-morphism p-6 rounded-[2rem] border transition-all text-left group ${
                            selectedWard?.id === ward.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 hover:border-emerald-500/30'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-3 rounded-xl ${
                                ward.type === 'ICU' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                                <BedIcon className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Occupancy</p>
                                <p className="text-xl font-black">{Math.round((ward.occupied / ward.beds) * 100)}%</p>
                            </div>
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-lg mb-1">{ward.name}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">{ward.type} Facility</p>
                        
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                            <div 
                                className={`h-full transition-all duration-1000 ${
                                    ward.type === 'ICU' ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${(ward.occupied / ward.beds) * 100}%` }}
                            ></div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-500">{ward.beds - ward.occupied} Empty</span>
                            <span className="text-white">{ward.occupied} Active</span>
                        </div>
                    </button>
                ))}
            </div>

            {selectedWard ? (
                <div className="glass-morphism rounded-[3rem] border border-white/5 p-10 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                <SparklesIcon className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedWard.name} <span className="text-emerald-400">Digital Twin</span></h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Interactive bed mapping & patient status</p>
                            </div>
                        </div>
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                                type="text"
                                placeholder="Locate bed or patient..."
                                className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all w-64"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-8 gap-4">
                        {Array.from({ length: selectedWard.beds }).map((_, i) => {
                            const isOccupied = i < selectedWard.occupied;
                            return (
                                <div 
                                    key={i}
                                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all cursor-pointer group ${
                                        isOccupied 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' 
                                        : 'bg-white/5 border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <BedIcon className={`w-6 h-6 ${isOccupied ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                                    <span className={`text-[10px] font-black ${isOccupied ? 'text-white' : 'text-slate-500'}`}>
                                        BED {String(i + 1).padStart(2, '0')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="glass-morphism rounded-[3rem] border border-white/5 p-20 flex flex-col items-center justify-center text-center opacity-50 grayscale">
                    <BuildingOfficeIcon className="w-20 h-20 text-slate-700 mb-6" />
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Select a ward to initialize twin engine</p>
                </div>
            )}
        </div>
    );
};
