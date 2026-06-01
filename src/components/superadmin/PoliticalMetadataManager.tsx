
import React, { useState, useEffect } from 'react';
import { 
    ArrowPathIcon, 
    ArrowUpTrayIcon, 
    PlusIcon, 
    XIcon 
} from '../icons';
import { apiService } from '../../services/apiService';
import { County, PoliticalParty, Constituency, Ward } from '../../types';
import { SmartPoliticalImporterModal } from '../SmartPoliticalImporterModal';

export const PoliticalMetadataManager: React.FC = () => {
    const [tab, setTab] = useState<'parties' | 'counties' | 'constituencies' | 'wards'>('parties');
    const [counties, setCounties] = useState<County[]>([]);
    const [parties, setParties] = useState<PoliticalParty[]>([]);
    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    
    // Pagination states
    const [partyLimit, setPartyLimit] = useState(20);
    const [constituencyLimit, setConstituencyLimit] = useState(20);
    const [wardLimit, setWardLimit] = useState(20);
    
    // Form states
    const [newName, setNewName] = useState('');
    const [newAcronym, setNewAcronym] = useState('');
    const [selectedCounty, setSelectedCounty] = useState('');
    const [selectedConstituency, setSelectedConstituency] = useState('');
    const [isImporterOpen, setIsImporterOpen] = useState(false);


    const loadData = async () => {
        setLoading(true);
        try {
            const [cData, pData, conData, wData] = await Promise.all([
                apiService.fetchModuleRecords<County>('counties'),
                apiService.fetchModuleRecords<PoliticalParty>('political_parties', undefined, partyLimit),
                apiService.fetchModuleRecords<Constituency>('constituencies', undefined, constituencyLimit),
                apiService.fetchModuleRecords<Ward>('wards', undefined, wardLimit)
            ]);
            setCounties(cData);
            setParties(pData);
            setConstituencies(conData);
            setWards(wData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [partyLimit, constituencyLimit, wardLimit]);

    const getConstituencyVoters = (conId: string) => {
        return wards
            .filter(w => String(w.constituencyId) === String(conId))
            .reduce((sum, w) => sum + (Number((w as any).registeredVoters) || 0), 0);
    };

    const getCountyVoters = (countyId: string) => {
        if (!countyId) return 0;
        const countyCons = constituencies.filter(c => String(c.countyId) === String(countyId)).map(c => String(c.id));
        return wards
            .filter(w => countyCons.includes(String(w.constituencyId)))
            .reduce((sum, w) => sum + (Number((w as any).registeredVoters) || 0), 0);
    };

    const handleAddItem = async () => {
        if (!newName) return;
        try {
            if (tab === 'parties') {
                await apiService.saveModuleRecord('political_parties', {
                    id: `party_${Date.now()}`,
                    name: newName,
                    acronym: newAcronym,
                    createdAt: new Date().toISOString()
                });
            } else if (tab === 'counties') {
                await apiService.saveModuleRecord('counties', {
                    id: `county_${Date.now()}`,
                    name: newName,
                    code: newAcronym || `C${Math.floor(Math.random() * 1000)}`,
                    status: 'active',
                    createdAt: new Date().toISOString()
                });
            } else if (tab === 'constituencies') {
                if (!selectedCounty) return;
                await apiService.saveModuleRecord('constituencies', {
                    id: `con_${Date.now()}`,
                    countyId: selectedCounty,
                    name: newName,
                    createdAt: new Date().toISOString()
                });
            } else if (tab === 'wards') {
                if (!selectedConstituency) return;
                await apiService.saveModuleRecord('wards', {
                    id: `ward_${Date.now()}`,
                    constituency_id: selectedConstituency,
                    name: newName,
                    createdAt: new Date().toISOString()
                });
            }
            setShowAdd(false);
            setNewName('');
            setNewAcronym('');
            loadData();
        } catch (e) {
            console.error(e);
            alert("Error adding metadata.");
        }
    };

    if (loading) return <ArrowPathIcon className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex bg-slate-100 dark:bg-slate-930 p-2 rounded-2xl w-full md:w-fit overflow-x-auto custom-scrollbar-horizontal pb-2">
                {['parties', 'counties', 'constituencies', 'wards'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setTab(t as any)}
                        className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === t ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {isImporterOpen && (
                <SmartPoliticalImporterModal 
                    type="registry"
                    onClose={() => setIsImporterOpen(false)} 
                    onRefresh={loadData} 
                />
            )}

            <div className="bg-white dark:bg-slate-800 p-12 rounded-[3.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Political Registry</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage global {tab} for all campaigns</p>
                    </div>

                    {(tab === 'constituencies' || tab === 'wards') && (
                        <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                            <div className="w-full md:w-64">
                                <label className="text-[8px] font-black uppercase text-indigo-500 tracking-[0.2em] block mb-2 ml-1">Filter by County</label>
                                <select 
                                    value={selectedCounty} 
                                    onChange={e => {
                                        setSelectedCounty(e.target.value);
                                        setSelectedConstituency(''); 
                                    }} 
                                    className="form-select bg-slate-50 dark:bg-slate-900 border-none rounded-2xl h-12 w-full text-[10px] font-bold uppercase tracking-widest"
                                >
                                    <option value="">All Counties</option>
                                    {counties.map(c => <option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}
                                </select>
                            </div>
                            {selectedCounty && (
                                <div className="bg-indigo-50 dark:bg-indigo-950/30 px-6 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">County Total</span>
                                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">
                                        {getCountyVoters(selectedCounty)?.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => setIsImporterOpen(true)}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
                        >
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            Import Registry
                        </button>
                        <button 
                            onClick={() => setShowAdd(!showAdd)}
                            className="btn-primary h-12 px-8 flex items-center gap-2"
                        >
                            {showAdd ? <XIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                            Add {tab.slice(0, -1)}
                        </button>
                    </div>
                </div>

                {showAdd && (
                    <div className="mb-12 p-8 bg-slate-50 dark:bg-slate-930 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {tab === 'wards' && (
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Select Constituency</label>
                                    <select 
                                        value={selectedConstituency} 
                                        onChange={e => setSelectedConstituency(e.target.value)} 
                                        className="form-select"
                                        disabled={!selectedCounty}
                                    >
                                        <option value="">Choose Constituency...</option>
                                        {constituencies
                                            .filter(c => !selectedCounty || String(c.countyId) === String(selectedCounty))
                                            .map(c => <option key={String(c.id)} value={String(c.id)}>{c.name}</option>)
                                        }
                                    </select>
                                    {!selectedCounty && <p className="text-[9px] text-amber-600 mt-2 font-bold italic">Please select a county above first</p>}
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">{tab.slice(0, -1)} Name</label>
                                <input value={newName} onChange={e => setNewName(e.target.value)} className="form-input" placeholder={tab === 'counties' ? 'e.g. Nairobi, Mombasa' : 'e.g. Jubilee Party, Westlands, etc.'} />
                            </div>
                            {(tab === 'parties' || tab === 'counties') && (
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">{tab === 'counties' ? 'County Code' : 'Acronym'}</label>
                                    <input value={newAcronym} onChange={e => setNewAcronym(e.target.value)} className="form-input" placeholder={tab === 'counties' ? 'e.g. 047' : 'e.g. JP, ODM, UDA'} />
                                </div>
                            )}
                        </div>
                        <button onClick={handleAddItem} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all">Register {tab.slice(0, -1)}</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tab === 'parties' && parties.map(p => (
                        <div key={String(p.id)} className="p-6 bg-slate-50 dark:bg-slate-930 rounded-3xl flex justify-between items-center group border border-transparent shadow-sm">
                            <div>
                                <h5 className="font-black text-slate-900 dark:text-white uppercase text-base">{p.name}</h5>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.acronym || 'No Acronym'}</span>
                            </div>
                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-indigo-600 border border-slate-100 dark:border-slate-700 shadow-sm transition-transform group-hover:rotate-12">
                                {p.acronym?.slice(0, 2) || p.name.slice(0, 2)}
                            </div>
                        </div>
                    ))}

                    {tab === 'counties' && counties.map(c => (
                        <div key={String(c.id)} className="p-6 bg-slate-50 dark:bg-slate-930 rounded-3xl flex justify-between items-end group border border-transparent shadow-sm">
                            <div>
                                <h5 className="font-black text-slate-900 dark:text-white uppercase text-base leading-tight mb-1">{c.name}</h5>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code: {c.code || 'N/A'}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Total Voters</span>
                                <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 border border-slate-100 dark:border-slate-700 shadow-sm leading-none inline-block">
                                    {getCountyVoters(c.id)?.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}

                    {tab === 'constituencies' && (
                        constituencies
                            .filter(c => !selectedCounty || String(c.countyId) === String(selectedCounty))
                            .map(c => (
                                <div key={String(c.id)} className="p-8 bg-slate-50 dark:bg-slate-930 rounded-[2.5rem] group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 transition-all shadow-sm flex justify-between items-end">
                                    <div>
                                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">
                                            {counties.find(co => String(co.id) === String(c.countyId))?.name || 'Unknown County'}
                                        </span>
                                        <h5 className="font-black text-slate-900 dark:text-white uppercase text-base leading-tight">{c.name}</h5>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Voters</span>
                                        <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 border border-slate-100 dark:border-slate-700 shadow-sm">
                                            {getConstituencyVoters(c.id)?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))
                    )}

                    {tab === 'wards' && (
                        wards
                            .filter(w => {
                                if (!selectedCounty && !selectedConstituency) return true;
                                if (selectedConstituency) return String(w.constituencyId) === String(selectedConstituency);
                                // If only county selected, find if ward's constituency belongs to that county
                                if (selectedCounty) {
                                    const con = constituencies.find(c => String(c.id) === String(w.constituencyId));
                                    return con && String(con.countyId) === String(selectedCounty);
                                }
                                return true;
                            })
                            .map(w => (
                                <div key={String(w.id)} className="p-8 bg-slate-50 dark:bg-slate-930 rounded-[2.5rem] group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 transition-all shadow-sm flex justify-between items-end">
                                    <div>
                                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">
                                            {constituencies.find(con => String(con.id) === String(w.constituencyId))?.name || 'Unknown Constituency'}
                                        </span>
                                        <h5 className="font-black text-slate-900 dark:text-white uppercase text-base leading-tight">{w.name}</h5>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                            { (w as any).electionYear ? `Voters (${(w as any).electionYear})` : 'Registered Voters' }
                                        </span>
                                        <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 border border-slate-100 dark:border-slate-700 shadow-sm">
                                            {(w as any).registeredVoters?.toLocaleString() || '0'}
                                        </span>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
                
                <div className="mt-12 flex justify-center gap-6">
                    {tab === 'parties' && parties.length >= partyLimit && (
                        <button 
                            onClick={() => setPartyLimit(prev => prev + 20)}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <ArrowPathIcon className="w-4 h-4" /> Sync More Parties
                        </button>
                    )}
                    {tab === 'constituencies' && constituencies.filter(c => !selectedCounty || String(c.countyId) === String(selectedCounty)).length >= constituencyLimit && (
                        <button 
                            onClick={() => setConstituencyLimit(prev => prev + 20)}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <ArrowPathIcon className="w-4 h-4" /> Sync More Constituencies
                        </button>
                    )}
                    {tab === 'wards' && wards.length >= wardLimit && (
                        <button 
                            onClick={() => setWardLimit(prev => prev + 20)}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <ArrowPathIcon className="w-4 h-4" /> Sync More Wards
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
