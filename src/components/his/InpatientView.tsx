import React, { useState } from 'react';
import { BedIcon } from '../icons/BedIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { apiService } from '../../services/apiService';

interface InpatientViewProps {
    institutionId?: string;
    onAddWard?: () => void;
    refreshTrigger?: number;
}

export function InpatientView({ institutionId, onAddWard, refreshTrigger }: InpatientViewProps) {
    const [selectedWard, setSelectedWard] = useState<any | null>(null);
    const [wards, setWards] = useState<any[]>([]);
    const [inpatientRecords, setInpatientRecords] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchWards = React.useCallback(async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const [wardsData, recordsData, patientsData] = await Promise.all([
                apiService.fetchModuleRecords('his_wards', institutionId).catch(() => []),
                apiService.fetchModuleRecords('his_inpatient_records', institutionId).catch(() => []),
                apiService.fetchModuleRecords('his_patients', institutionId).catch(() => [])
            ]);
            setWards(wardsData || []);
            setInpatientRecords(recordsData || []);
            setPatients(patientsData || []);
        } catch (error) {
            console.error("Failed to fetch wards:", error);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId]);

    React.useEffect(() => {
        fetchWards();
    }, [fetchWards, refreshTrigger]);

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Ward <span className="text-emerald-400">Inventory</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Real-time facility occupancy tracking</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={fetchWards}
                        className="glass-morphism px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
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
                {isLoading ? (
                    [1,2,3,4].map(i => (
                        <div key={i} className="glass-morphism p-6 rounded-[2rem] border border-white/5 animate-pulse min-h-[150px]"></div>
                    ))
                ) : wards.length > 0 ? (
                    wards.map(ward => (
                        <button 
                            key={ward.id}
                            onClick={() => setSelectedWard(ward)}
                            className={`glass-morphism p-6 rounded-[2rem] border transition-all text-left group ${
                                selectedWard?.id === ward.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 hover:border-emerald-500/30'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-xl ${
                                    ward.wardType === 'ICU' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                    <BedIcon className="w-6 h-6" />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Node Status</p>
                                    <p className="text-xl font-black">{ward.capacity} Beds</p>
                                </div>
                            </div>
                            <h3 className="font-black uppercase tracking-tight text-lg mb-1">{ward.name}</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">{ward.wardType} Ward • Floor {ward.floorLevel}</p>
                            
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-500">100% Vacant</span>
                                <span className="text-emerald-500">Ready</span>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="md:col-span-4 p-20 glass-morphism rounded-[3rem] border border-white/5 text-center">
                        <BuildingOfficeIcon className="w-20 h-20 text-slate-800 mx-auto mb-6 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">No active wards found <br/>Initialize your facility infrastructure</p>
                    </div>
                )}
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

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {Array.from({ length: selectedWard.capacity || 0 }).map((_, i) => {
                            const bedNumber = (i + 1).toString();
                            const record = inpatientRecords.find(r => r.wardId === selectedWard.id && String(r.bedNumber) === bedNumber && r.status === 'Admitted');
                            const patient = record ? patients.find(p => p.id === record.patientId) : null;
                            const isOccupied = !!record;

                            return (
                                <div 
                                    key={i}
                                    className={`p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 border transition-all cursor-pointer group relative overflow-hidden ${
                                        isOccupied 
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-500/20' 
                                        : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-emerald-500/50'
                                    }`}
                                >
                                    {isOccupied && (
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        </div>
                                    )}
                                    <div className={`p-4 rounded-2xl ${isOccupied ? 'bg-white/10' : 'bg-slate-50 dark:bg-white/5'}`}>
                                        <BedIcon className={`w-8 h-8 ${isOccupied ? 'text-white' : 'text-slate-400'}`} />
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${isOccupied ? 'text-indigo-200' : 'text-slate-400'}`}>BED {bedNumber.padStart(2, '0')}</p>
                                        <h4 className={`text-[11px] font-black uppercase tracking-tight mt-1 truncate max-w-[120px] ${isOccupied ? 'text-white' : 'text-slate-300'}`}>
                                            {isOccupied ? patient?.fullName : 'VACANT'}
                                        </h4>
                                        {isOccupied && (
                                            <p className="text-[8px] font-bold text-indigo-200 mt-1 uppercase">Since {new Date(record.admissionDate).toLocaleDateString()}</p>
                                        )}
                                    </div>
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

export default InpatientView;
