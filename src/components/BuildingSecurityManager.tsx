import React, { useState, useMemo } from 'react';
import type { BuildingFloor, BuildingOffice, BuildingVisitorLog, BuildingVisitorAsset, Institution, CompanyDetails, User } from '../types';
import { apiService } from '../services/apiService';
import { printService } from '../services/printService';

// Inline SVGs for self-containment & bulletproof builds
const QrIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

interface BuildingSecurityManagerProps {
    floors: BuildingFloor[];
    offices: BuildingOffice[];
    visitorLogs: BuildingVisitorLog[];
    visitorAssets: BuildingVisitorAsset[];
    institution?: Institution;
    companyDetails?: CompanyDetails;
    users?: User[];
    currentUser?: User;
    onAddFloor: (f: Omit<BuildingFloor, 'id'>) => Promise<void>;
    onAddOffice: (o: Omit<BuildingOffice, 'id'>) => Promise<void>;
    onAddVisitorLog: (v: Omit<BuildingVisitorLog, 'id'>, assets: Omit<BuildingVisitorAsset, 'id' | 'visitorLogId'>[]) => Promise<void>;
    onUpdateVisitorLog: (id: string, data: Partial<BuildingVisitorLog>) => Promise<void>;
    onVerifyAsset: (assetId: string, verified: boolean) => Promise<void>;
    onRefreshData?: () => Promise<void>;
    onAddUser?: (user: any) => Promise<void>;
    onSwitchPerspective?: (role: any) => void;
}

export const BuildingSecurityManager: React.FC<BuildingSecurityManagerProps> = ({
    floors = [],
    offices = [],
    visitorLogs = [],
    visitorAssets = [],
    institution,
    companyDetails,
    users = [],
    currentUser,
    onAddFloor,
    onAddOffice,
    onAddVisitorLog,
    onUpdateVisitorLog,
    onVerifyAsset,
    onRefreshData,
    onAddUser,
    onSwitchPerspective
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'directory' | 'visitors' | 'checkpoint' | 'office_portal'>('dashboard');
    const [selectedPortalOfficeId, setSelectedPortalOfficeId] = useState('');
    const [portalSubTab, setPortalSubTab] = useState<'visitors' | 'staff'>('visitors');
    
    // Portal Staff Form States
    const [portalStaffName, setPortalStaffName] = useState('');
    const [portalStaffPhone, setPortalStaffPhone] = useState('');
    const [portalStaffEmail, setPortalStaffEmail] = useState('');
    const [isSavingPortalStaff, setIsSavingPortalStaff] = useState(false);

    // Portal Expected Visitor Form States
    const [portalPreName, setPortalPreName] = useState('');
    const [portalPrePhone, setPortalPrePhone] = useState('');
    const [portalPreIdCard, setPortalPreIdCard] = useState('');
    const [portalPrePlate, setPortalPrePlate] = useState('');
    const [portalPrePurpose, setPortalPrePurpose] = useState('Official Meeting');
    const [isSavingPortalPre, setIsSavingPortalPre] = useState(false);

    // Search and Filter states
    const [directorySearch, setDirectorySearch] = useState('');
    const [visitorSearch, setVisitorSearch] = useState('');
    const [checkpointSearch, setCheckpointSearch] = useState('');

    // Floor Form States
    const [showFloorModal, setShowFloorModal] = useState(false);
    const [floorNum, setFloorNum] = useState<number>(1);
    const [floorName, setFloorName] = useState('');
    const [floorDesc, setFloorDesc] = useState('');
    const [isSavingFloor, setIsSavingFloor] = useState(false);

    // Office Form States
    const [showOfficeModal, setShowOfficeModal] = useState(false);
    const [selectedFloorId, setSelectedFloorId] = useState('');
    const [officeNum, setOfficeNum] = useState('');
    const [tenantName, setTenantName] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [isSavingOffice, setIsSavingOffice] = useState(false);

    // Visitor Checkin States
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [visitorName, setVisitorName] = useState('');
    const [visitorPhone, setVisitorPhone] = useState('');
    const [visitorIdCard, setVisitorIdCard] = useState('');
    const [visitorPlate, setVisitorPlate] = useState('');
    const [visitorPurpose, setVisitorPurpose] = useState('');
    const [visitorOfficeId, setVisitorOfficeId] = useState('');
    
    // Luggage Asset States inside checkin form
    const [checkinAssets, setCheckinAssets] = useState<{ itemName: string; serialNumber: string; notes: string }[]>([]);
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetSerial, setNewAssetSerial] = useState('');
    const [newAssetNotes, setNewAssetNotes] = useState('');
    const [isSavingVisitor, setIsSavingVisitor] = useState(false);

    // Selected Log for Checkpoint detailing
    const [selectedLog, setSelectedLog] = useState<BuildingVisitorLog | null>(null);
    const [gateNotes, setGateNotes] = useState('');

    // Stats calculations
    const stats = useMemo(() => {
        const active = visitorLogs.filter(v => v.status === 'checked_in').length;
        const pending = visitorLogs.filter(v => v.status === 'registered' && !v.authorizedByHost).length;
        const authorized = visitorLogs.filter(v => v.status === 'registered' && v.authorizedByHost).length;
        const exitToday = visitorLogs.filter(v => v.status === 'checked_out').length;
        return { active, pending, authorized, exitToday };
    }, [visitorLogs]);

    const handleAddAssetItem = () => {
        if (!newAssetName) return;
        setCheckinAssets([...checkinAssets, { itemName: newAssetName, serialNumber: newAssetSerial, notes: newAssetNotes }]);
        setNewAssetName('');
        setNewAssetSerial('');
        setNewAssetNotes('');
    };

    const handleRemoveAssetItem = (idx: number) => {
        setCheckinAssets(checkinAssets.filter((_, i) => i !== idx));
    };

    const handleSaveFloorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!floorName) return;
        setIsSavingFloor(true);
        try {
            await onAddFloor({
                institutionId: institution?.id || 'default_inst',
                floorNumber: Number(floorNum),
                floorName,
                description: floorDesc
            });
            setShowFloorModal(false);
            setFloorName('');
            setFloorDesc('');
            setFloorNum(floors.length + 1);
            if (onRefreshData) await onRefreshData();
        } catch (err: any) {
            alert(err.message || "Failed to create floor");
        } finally {
            setIsSavingFloor(false);
        }
    };

    const handleSaveOfficeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFloorId || !officeNum || !tenantName || !contactName || !contactPhone) {
            alert("Please fill all required fields");
            return;
        }
        setIsSavingOffice(true);
        try {
            await onAddOffice({
                floorId: selectedFloorId,
                officeNumber: officeNum,
                tenantName,
                contactPersonName: contactName,
                contactPhone,
                contactEmail
            });
            setShowOfficeModal(false);
            setOfficeNum('');
            setTenantName('');
            setContactName('');
            setContactPhone('');
            setContactEmail('');
            if (onRefreshData) await onRefreshData();
        } catch (err: any) {
            alert(err.message || "Failed to create office suite");
        } finally {
            setIsSavingOffice(false);
        }
    };

    const handleRegisterVisitorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitorName || !visitorPhone || !visitorIdCard || !visitorPurpose) {
            alert("Please fill in visitor name, phone, ID and purpose of visit");
            return;
        }
        setIsSavingVisitor(true);
        try {
            await onAddVisitorLog({
                institutionId: institution?.id || 'default_inst',
                officeId: visitorOfficeId || undefined,
                visitorName,
                phoneNumber: visitorPhone,
                idNumber: visitorIdCard,
                vehiclePlate: visitorPlate || undefined,
                purpose: visitorPurpose,
                status: 'registered',
                authorizedByHost: false
            }, checkinAssets);

            alert("Visitor registered successfully! An entry pass can now be printed at the checkpoints.");
            setShowCheckinModal(false);
            setVisitorName('');
            setVisitorPhone('');
            setVisitorIdCard('');
            setVisitorPlate('');
            setVisitorPurpose('');
            setVisitorOfficeId('');
            setCheckinAssets([]);
            if (onRefreshData) await onRefreshData();
        } catch (err: any) {
            alert(err.message || "Failed to register visitor");
        } finally {
            setIsSavingVisitor(false);
        }
    };

    const handlePortalAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const officeId = currentUser?.metadata?.officeId || selectedPortalOfficeId;
        if (!officeId) {
            alert("No active office workspace selected!");
            return;
        }
        if (!portalStaffName || !portalStaffPhone || !portalStaffEmail) {
            alert("Please fill in staff name, phone, and email.");
            return;
        }
        setIsSavingPortalStaff(true);
        try {
            if (onAddUser) {
                await onAddUser({
                    name: portalStaffName,
                    email: portalStaffEmail,
                    phoneNumber: portalStaffPhone,
                    role: 'staff',
                    metadata: { officeId }
                });
                alert("Office staff member registered successfully!");
                setPortalStaffName('');
                setPortalStaffPhone('');
                setPortalStaffEmail('');
                if (onRefreshData) await onRefreshData();
            } else {
                alert("User creation interface is not linked. Contact building admin.");
            }
        } catch (err: any) {
            alert(err.message || "Failed to create staff member");
        } finally {
            setIsSavingPortalStaff(false);
        }
    };

    const handlePortalPreAuthVisitor = async (e: React.FormEvent) => {
        e.preventDefault();
        const officeId = currentUser?.metadata?.officeId || selectedPortalOfficeId;
        if (!officeId) {
            alert("No active office workspace selected!");
            return;
        }
        if (!portalPreName || !portalPrePhone || !portalPreIdCard || !portalPrePurpose) {
            alert("Please fill in visitor name, phone, ID card number, and purpose.");
            return;
        }
        setIsSavingPortalPre(true);
        try {
            await onAddVisitorLog({
                institutionId: institution?.id || 'default_inst',
                officeId,
                visitorName: portalPreName,
                phoneNumber: portalPrePhone,
                idNumber: portalPreIdCard,
                vehiclePlate: portalPrePlate || undefined,
                purpose: portalPrePurpose,
                status: 'registered',
                authorizedByHost: true,
                notifiedAt: new Date().toISOString()
            }, []);
            
            alert("Visitor pre-authorized successfully! They are logged in the checkpoint queue.");
            setPortalPreName('');
            setPortalPrePhone('');
            setPortalPreIdCard('');
            setPortalPrePlate('');
            setPortalPrePurpose('Official Meeting');
            if (onRefreshData) await onRefreshData();
        } catch (err: any) {
            alert(err.message || "Failed to pre-authorize visitor");
        } finally {
            setIsSavingPortalPre(false);
        }
    };

    const handleSimulateHostApproval = async (logId: string, approve: boolean) => {
        try {
            await onUpdateVisitorLog(logId, {
                authorizedByHost: approve,
                status: approve ? 'registered' : 'declined',
                notifiedAt: new Date().toISOString()
            });
            if (onRefreshData) await onRefreshData();
        } catch (err: any) {
            alert("Approval simulation failed: " + err.message);
        }
    };

    const handleSecurityCheckin = async (log: BuildingVisitorLog) => {
        if (!window.confirm(`Check in ${log.visitorName}? Please make sure to verify identification document.`)) return;
        try {
            await onUpdateVisitorLog(log.id, {
                status: 'checked_in',
                timeIn: new Date().toLocaleTimeString(),
                entryLoggedBy: currentUser?.id || 'Guard'
            });
            setSelectedLog(null);
            if (onRefreshData) await onRefreshData();
            alert("Visitor Checked In successfully!");
        } catch (err: any) {
            alert("Entry check-in failed: " + err.message);
        }
    };

    const handleSecurityCheckout = async (log: BuildingVisitorLog) => {
        const unverified = visitorAssets.filter(a => a.visitorLogId === log.id && !a.verifiedAtExit);
        if (unverified.length > 0) {
            if (!window.confirm(`Warning: There are ${unverified.length} unverified luggage assets. Continue checkout anyway?`)) {
                return;
            }
        }
        try {
            await onUpdateVisitorLog(log.id, {
                status: 'checked_out',
                timeOut: new Date().toLocaleTimeString(),
                exitLoggedBy: currentUser?.id || 'Guard'
            });
            setSelectedLog(null);
            if (onRefreshData) await onRefreshData();
            alert("Visitor checked out, logs updated.");
        } catch (err: any) {
            alert("Checkout update failed: " + err.message);
        }
    };

    // Filter Directory
    const filteredDirectory = useMemo(() => {
        const query = directorySearch.toLowerCase();
        return floors.map(floor => {
            const floorOffices = offices.filter(o => o.floorId === floor.id && 
                (o.officeNumber.toLowerCase().includes(query) || o.tenantName.toLowerCase().includes(query) || o.contactPersonName.toLowerCase().includes(query))
            );
            return { ...floor, suites: floorOffices };
        }).filter(f => f.suites.length > 0 || f.floorName.toLowerCase().includes(query));
    }, [floors, offices, directorySearch]);

    // Filter Visitors list
    const filteredVisitorLogs = useMemo(() => {
        const query = visitorSearch.toLowerCase();
        return visitorLogs.filter(log => 
            log.visitorName.toLowerCase().includes(query) || 
            log.phoneNumber.includes(query) || 
            log.idNumber.includes(query) ||
            log.status.includes(query)
        );
    }, [visitorLogs, visitorSearch]);

    // Filter Checkpoints entries
    const filteredCheckpointLogs = useMemo(() => {
        const query = checkpointSearch.toLowerCase();
        return visitorLogs.filter(log => 
            (log.status === 'registered' || log.status === 'checked_in') &&
            (log.visitorName.toLowerCase().includes(query) || log.phoneNumber.includes(query) || log.idNumber.includes(query))
        );
    }, [visitorLogs, checkpointSearch]);

    // Print Badge pass simulation
    const handlePrintPass = (log: BuildingVisitorLog) => {
        const officeObj = offices.find(o => o.id === log.officeId);
        const hostName = officeObj?.tenantName || 'N/A';
        
        printService.printVisitorPass({
            visitorData: log,
            institution: institution || { name: 'Building Management' },
            host: { name: hostName }
        }).catch(err => {
            console.error("Visitor pass printing failed:", err);
            alert("Print failed: " + (err.message || err));
        });
    };

    return (
        <div className="p-6 space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">SentinelPass Security</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">SentinelPass - Automated Building Directory, Receptionist check-in, and Guard checkpoint logs</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowCheckinModal(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md hover:bg-indigo-650 transition-all active:scale-95"
                    >
                        <PlusIcon />
                        New Visitor Check-In
                    </button>
                </div>
            </div>

            {/* Tab Links */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto pb-1 no-scrollbar items-center">
                {onSwitchPerspective && (
                    <button
                        onClick={() => onSwitchPerspective(null)}
                        className="flex items-center gap-2 py-3.5 px-4 border-b-2 border-transparent font-black uppercase text-[10px] tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-all whitespace-nowrap mr-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl"
                    >
                        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        <span>Portal Hub</span>
                    </button>
                )}
                {[
                    { id: 'dashboard', label: 'Security Dashboard', icon: '📊' },
                    { id: 'directory', label: 'Office Directory', icon: '🏢' },
                    { id: 'visitors', label: 'Visitor Logs', icon: '🛋️' },
                    { id: 'checkpoint', label: 'Guard Checkpoint', icon: '🚧' },
                    { id: 'office_portal', label: 'Office Workspace', icon: '🚪' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setSelectedLog(null); }}
                        className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' 
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    {/* Live Occupancy Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Active In Building', val: stats.active, cls: 'text-indigo-600', desc: 'Checked in at gate' },
                            { label: 'Pending Host Approvals', val: stats.pending, cls: 'text-amber-500', desc: 'Awaiting host SMS ping' },
                            { label: 'Approved & Registered', val: stats.authorized, cls: 'text-emerald-500', desc: 'Ready for gate check-in' },
                            { label: 'Exit Log Count', val: stats.exitToday, cls: 'text-slate-500', desc: 'Checked out today' }
                        ].map((card, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{card.label}</span>
                                <h3 className={`text-3xl font-black ${card.cls}`}>{card.val}</h3>
                                <span className="text-[9px] font-bold text-slate-400 block">{card.desc}</span>
                            </div>
                        ))}
                    </div>

                    {/* Quick Simulation Board */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight">Host Verification Panel (Simulated)</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Simulate office occupants approving or declining visitor entrance from their SMS links</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase font-black tracking-wider">
                                        <th className="py-3 px-4">Visitor</th>
                                        <th className="py-3 px-4">Destination Office</th>
                                        <th className="py-3 px-4">Purpose</th>
                                        <th className="py-3 px-4">Host Verification Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visitorLogs.filter(v => v.status === 'registered').map((log, idx) => {
                                        const officeObj = offices.find(o => o.id === log.officeId);
                                        return (
                                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50">
                                                <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">{log.visitorName} <span className="text-[9px] text-slate-400 font-medium font-mono">({log.phoneNumber})</span></td>
                                                <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-350">{officeObj ? `${officeObj.officeNumber} (${officeObj.tenantName})` : 'General Admin'}</td>
                                                <td className="py-3 px-4 text-slate-500">{log.purpose}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                        log.authorizedByHost 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                            : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
                                                    }`}>
                                                        {log.authorizedByHost ? 'Authorized' : 'Awaiting Approval'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right flex justify-end gap-2">
                                                    {!log.authorizedByHost && (
                                                        <>
                                                            <button
                                                                onClick={() => handleSimulateHostApproval(log.id, true)}
                                                                className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700"
                                                            >
                                                                Approve Entry
                                                            </button>
                                                            <button
                                                                onClick={() => handleSimulateHostApproval(log.id, false)}
                                                                className="px-3 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-700"
                                                            >
                                                                Decline
                                                            </button>
                                                        </>
                                                    )}
                                                    {log.authorizedByHost && (
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider py-1 block">Approved ✓</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {visitorLogs.filter(v => v.status === 'registered').length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                                No registered visitors awaiting host verification
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DIRECTORY TAB --- */}
            {activeTab === 'directory' && (
                <div className="space-y-6">
                    
                    {/* Filter and buttons */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <SearchIcon />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by office number, tenant or host name..."
                                value={directorySearch}
                                onChange={(e) => setDirectorySearch(e.target.value)}
                                className="w-full pl-11 pr-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => {
                                    setFloorNum(floors.length + 1);
                                    setShowFloorModal(true);
                                }}
                                className="px-5 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                Register Floor
                            </button>
                            <button
                                disabled={floors.length === 0}
                                onClick={() => {
                                    if (floors.length > 0) setSelectedFloorId(floors[0].id);
                                    setShowOfficeModal(true);
                                }}
                                className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                Register Office Suite
                            </button>
                        </div>
                    </div>

                    {/* Floor Directory Cards */}
                    <div className="space-y-8">
                        {filteredDirectory.map((floor, fIdx) => (
                            <div key={fIdx} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 space-y-6">
                                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-end">
                                    <div>
                                        <h3 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight">{floor.floorName}</h3>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{floor.description || 'No description'}</p>
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full uppercase tracking-wider">
                                        Floor Level {floor.floorNumber}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {floor.suites.map((office, oIdx) => (
                                        <div key={oIdx} className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-3 relative overflow-hidden group">
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-black text-slate-900 dark:text-white px-3 py-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 font-mono">
                                                    {office.officeNumber}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white">{office.tenantName}</h4>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Primary Host Contact:</p>
                                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{office.contactPersonName}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{office.contactPhone} {office.contactEmail ? `| ${office.contactEmail}` : ''}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {floor.suites.length === 0 && (
                                        <div className="col-span-3 text-center py-6 text-slate-400 font-medium text-xs">
                                            No office suites registered on this floor
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {filteredDirectory.length === 0 && (
                            <div className="bg-white dark:bg-slate-900 py-16 text-center rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-slate-400 font-medium text-xs">
                                No floors or offices found matching the directory search query
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- VISITOR LOGS TAB --- */}
            {activeTab === 'visitors' && (
                <div className="space-y-6">
                    {/* Search and Filters */}
                    <div className="flex justify-between items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <SearchIcon />
                            </span>
                            <input
                                type="text"
                                placeholder="Search visitor log details..."
                                value={visitorSearch}
                                onChange={(e) => setVisitorSearch(e.target.value)}
                                className="w-full pl-11 pr-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Visitor Log Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase font-black tracking-wider">
                                        <th className="py-3 px-4">Visitor</th>
                                        <th className="py-3 px-4">Identity / Plate</th>
                                        <th className="py-3 px-4">Destination Suite</th>
                                        <th className="py-3 px-4">Logs (In/Out)</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Pass Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisitorLogs.map((log, idx) => {
                                        const officeObj = offices.find(o => o.id === log.officeId);
                                        return (
                                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/30">
                                                <td className="py-3 px-4">
                                                    <p className="font-bold text-slate-900 dark:text-white">{log.visitorName}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{log.phoneNumber}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-semibold text-slate-700 dark:text-slate-350">ID: {log.idNumber}</p>
                                                    {log.vehiclePlate && <p className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded font-mono inline-block mt-0.5">{log.vehiclePlate}</p>}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-bold text-slate-800 dark:text-white">{officeObj?.officeNumber || 'General'}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase mt-0.5">{officeObj?.tenantName || 'Administration'}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-medium text-slate-700 dark:text-slate-300">In: {log.timeIn || '—'}</p>
                                                    <p className="text-[10px] text-slate-400">Out: {log.timeOut || '—'}</p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                        log.status === 'checked_in' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400' :
                                                        log.status === 'checked_out' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                                        log.status === 'declined' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400' :
                                                        'bg-slate-50 text-slate-700 border-slate-150'
                                                    }`}>
                                                        {log.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => handlePrintPass(log)}
                                                        className="px-3.5 py-2 border border-slate-200 hover:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Print Pass
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredVisitorLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                                                No visitor logs registered in the system
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CHECKPOINT TAB --- */}
            {activeTab === 'checkpoint' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Registered Lists */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Gate Search Panel</h3>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <SearchIcon />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search by visitor ID, name or phone number..."
                                    value={checkpointSearch}
                                    onChange={(e) => setCheckpointSearch(e.target.value)}
                                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <h3 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight">Pending Gate Clearance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredCheckpointLogs.map((log, idx) => {
                                    const isInside = log.status === 'checked_in';
                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => setSelectedLog(log)}
                                            className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                                                selectedLog?.id === log.id 
                                                    ? 'border-indigo-650 bg-indigo-50/10 dark:border-white' 
                                                    : 'border-slate-150 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-black text-slate-900 dark:text-white text-xs">{log.visitorName}</h4>
                                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${
                                                    isInside 
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>
                                                    {isInside ? 'In Building' : 'Awaiting Entry'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-mono mt-1">ID No: {log.idNumber} | Tel: {log.phoneNumber}</p>
                                            <p className="text-[10px] text-slate-400 mt-2 font-bold">Purpose: {log.purpose}</p>
                                        </div>
                                    );
                                })}
                                {filteredCheckpointLogs.length === 0 && (
                                    <div className="col-span-2 py-8 text-center text-slate-400 font-medium text-xs">
                                        No visitors registered for gate check-in or checkout matching the search query
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Selected Gate Details / Asset Checker */}
                    <div className="md:col-span-1">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-full space-y-6">
                            <h3 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight">Security Check</h3>
                            {selectedLog ? (
                                <div className="space-y-6 text-xs font-semibold">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-2">
                                        <p><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Visitor Name</span> {selectedLog.visitorName}</p>
                                        <p><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Phone Number</span> {selectedLog.phoneNumber}</p>
                                        <p><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">ID / Passport No</span> {selectedLog.idNumber}</p>
                                        {selectedLog.vehiclePlate && <p><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Vehicle Registration</span> {selectedLog.vehiclePlate}</p>}
                                        <p><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Host Verification Status</span> {selectedLog.authorizedByHost ? 'Authorized ✓' : 'Awaiting Authorization ⚠️'}</p>
                                    </div>

                                    {/* Asset Luggage Verification */}
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Visitor Luggage Assets Check</span>
                                        <div className="space-y-2">
                                            {visitorAssets.filter(a => a.visitorLogId === selectedLog.id).map((asset, aIdx) => (
                                                <div key={aIdx} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 rounded-xl">
                                                    <div>
                                                        <p className="font-bold text-slate-850 dark:text-white">{asset.itemName}</p>
                                                        {asset.serialNumber && <p className="text-[9px] text-slate-400 font-mono mt-0.5">S/N: {asset.serialNumber}</p>}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => onVerifyAsset(asset.id, !asset.verifiedAtExit)}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                                asset.verifiedAtExit 
                                                                    ? 'bg-emerald-600 border-emerald-600 text-white' 
                                                                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}
                                                        >
                                                            {asset.verifiedAtExit ? 'Verified ✓' : 'Verify'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {visitorAssets.filter(a => a.visitorLogId === selectedLog.id).length === 0 && (
                                                <p className="text-center text-[10px] text-slate-400 font-bold p-4 uppercase">No electronics or assets logged for this visitor.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-4 border-t border-slate-100">
                                        {selectedLog.status === 'registered' ? (
                                            <button
                                                onClick={() => handleSecurityCheckin(selectedLog)}
                                                disabled={!selectedLog.authorizedByHost}
                                                className="w-full py-4 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md disabled:opacity-50"
                                            >
                                                Authorize Entry & Check In
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSecurityCheckout(selectedLog)}
                                                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md"
                                            >
                                                Complete Departure & Check Out
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-400 font-medium text-xs">
                                    Select a visitor card from the checkpoint list to perform check-in/out and baggage serial inspections
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- OFFICE PORTAL TAB --- */}
            {activeTab === 'office_portal' && (
                <div className="space-y-6">
                    {/* Workspace Selector */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Office Workspace Portal</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized suite representatives can manage their expected visitors, approve walk-ins, and register office staff</p>
                        </div>
                        <div>
                            {currentUser?.metadata?.officeId ? (
                                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white font-mono">
                                    🏢 Suite {offices.find(o => o.id === currentUser?.metadata?.officeId)?.officeNumber || 'N/A'} - {offices.find(o => o.id === currentUser?.metadata?.officeId)?.tenantName || 'Authorized office occupant'}
                                </div>
                            ) : (
                                <select
                                    value={selectedPortalOfficeId}
                                    onChange={(e) => setSelectedPortalOfficeId(e.target.value)}
                                    className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-800"
                                >
                                    <option value="">-- Switch Managed Office Workspace --</option>
                                    {offices.map(o => (
                                        <option key={o.id} value={o.id}>Suite {o.officeNumber} ({o.tenantName})</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {(currentUser?.metadata?.officeId || selectedPortalOfficeId) ? (
                        <div className="space-y-6">
                            
                            {/* Inner portal subtabs */}
                            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-1">
                                {[
                                    { id: 'visitors', label: 'Manage Office Visitors', icon: '🛋️' },
                                    { id: 'staff', label: 'Manage Office Staff', icon: '👥' }
                                ].map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setPortalSubTab(sub.id as any)}
                                        className={`pb-2 border-b-2 font-black uppercase text-[9px] tracking-wider transition-all ${
                                            portalSubTab === sub.id 
                                                ? 'border-indigo-600 text-indigo-600' 
                                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <span className="mr-1.5">{sub.icon}</span>
                                        {sub.label}
                                    </button>
                                ))}
                            </div>

                            {/* PORTAL VISITORS VIEW */}
                            {portalSubTab === 'visitors' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    
                                    {/* Pre-Authorization Visitor Form */}
                                    <div className="md:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 self-start">
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Pre-Authorize Expected Visitor</h3>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pre-approve visits to skip receptionist gate verification calls</p>
                                        </div>
                                        <form onSubmit={handlePortalPreAuthVisitor} className="space-y-4 text-xs font-bold text-slate-800">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visitor Full Name *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="John Doe"
                                                    value={portalPreName}
                                                    onChange={(e) => setPortalPreName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visitor Phone *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="0712345678"
                                                    value={portalPrePhone}
                                                    onChange={(e) => setPortalPrePhone(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">National ID / Passport No *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="34567890"
                                                    value={portalPreIdCard}
                                                    onChange={(e) => setPortalPreIdCard(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle Plate (If driving)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. KCD 123A"
                                                    value={portalPrePlate}
                                                    onChange={(e) => setPortalPrePlate(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose *</label>
                                                <input 
                                                    type="text" 
                                                    value={portalPrePurpose}
                                                    onChange={(e) => setPortalPrePurpose(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                                    required
                                                />
                                            </div>
                                            <button 
                                                type="submit" 
                                                disabled={isSavingPortalPre}
                                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-slate-850"
                                            >
                                                {isSavingPortalPre ? 'Saving...' : 'Pre-Authorize Visitor'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Incoming visitor logs list & visitor history */}
                                    <div className="md:col-span-2 space-y-6">
                                        {/* Awaiting office approvals */}
                                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight font-black">Pending Arrivals (Awaiting Action)</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 text-[9px] text-slate-400 uppercase font-black tracking-wider">
                                                            <th className="py-2.5 px-3">Visitor Name</th>
                                                            <th className="py-2.5 px-3">Purpose</th>
                                                            <th className="py-2.5 px-3 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {visitorLogs.filter(log => log.officeId === (currentUser?.metadata?.officeId || selectedPortalOfficeId) && log.status === 'registered' && !log.authorizedByHost).map((log, idx) => (
                                                            <tr key={idx} className="border-b border-slate-50">
                                                                <td className="py-3 px-3 font-bold text-slate-800 dark:text-white">{log.visitorName} <span className="text-[10px] text-slate-400">({log.phoneNumber})</span></td>
                                                                <td className="py-3 px-3 text-slate-500">{log.purpose}</td>
                                                                <td className="py-3 px-3 text-right flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleSimulateHostApproval(log.id, true)}
                                                                        className="px-2.5 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleSimulateHostApproval(log.id, false)}
                                                                        className="px-2.5 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider rounded"
                                                                    >
                                                                        Decline
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {visitorLogs.filter(log => log.officeId === (currentUser?.metadata?.officeId || selectedPortalOfficeId) && log.status === 'registered' && !log.authorizedByHost).length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="py-6 text-center text-slate-400 font-medium text-xs">No pending arrivals seeking entrance authorization.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* General office visitors history */}
                                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight font-black">Active & Historical Office Guests</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 text-[9px] text-slate-400 uppercase font-black tracking-wider">
                                                            <th className="py-2.5 px-3">Visitor</th>
                                                            <th className="py-2.5 px-3">Timestamps</th>
                                                            <th className="py-2.5 px-3">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {visitorLogs.filter(log => log.officeId === (currentUser?.metadata?.officeId || selectedPortalOfficeId)).map((log, idx) => (
                                                            <tr key={idx} className="border-b border-slate-50">
                                                                <td className="py-3 px-3 font-bold text-slate-800 dark:text-white">
                                                                    <p>{log.visitorName}</p>
                                                                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{log.idNumber}</p>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <p className="text-slate-700 dark:text-slate-350">In: {log.timeIn || '—'}</p>
                                                                    <p className="text-[10px] text-slate-400">Out: {log.timeOut || '—'}</p>
                                                                </td>
                                                                <td className="py-3 px-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                                                        log.status === 'checked_in' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                                        log.status === 'checked_out' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                        'bg-slate-50 text-slate-600'
                                                                    }`}>
                                                                        {log.status.replace('_', ' ')}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {visitorLogs.filter(log => log.officeId === (currentUser?.metadata?.officeId || selectedPortalOfficeId)).length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="py-6 text-center text-slate-400 font-medium text-xs">No guest records for this office workspace suite.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PORTAL STAFF VIEW */}
                            {portalSubTab === 'staff' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    
                                    {/* Register Staff Member Form */}
                                    <div className="md:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 self-start">
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Register Office Staff Member</h3>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Register office employees to enable security gate check-in logs</p>
                                        </div>
                                        <form onSubmit={handlePortalAddStaff} className="space-y-4 text-xs font-bold text-slate-800">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Full Name *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Jane Smith"
                                                    value={portalStaffName}
                                                    onChange={(e) => setPortalStaffName(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="0722000111"
                                                    value={portalStaffPhone}
                                                    onChange={(e) => setPortalStaffPhone(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address *</label>
                                                <input 
                                                    type="email" 
                                                    placeholder="jane@tenant.com"
                                                    value={portalStaffEmail}
                                                    onChange={(e) => setPortalStaffEmail(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                                    required
                                                />
                                            </div>
                                            <button 
                                                type="submit" 
                                                disabled={isSavingPortalStaff}
                                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-slate-850"
                                            >
                                                {isSavingPortalStaff ? 'Registering...' : 'Register Staff Member'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Staff list and check-in logs history */}
                                    <div className="md:col-span-2 space-y-6">
                                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight font-black">Active Office Staff Members</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 text-[9px] text-slate-400 uppercase font-black tracking-wider">
                                                            <th className="py-2.5 px-3">Name</th>
                                                            <th className="py-2.5 px-3">Phone</th>
                                                            <th className="py-2.5 px-3">Email Address</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {users.filter(u => u.metadata?.officeId === (currentUser?.metadata?.officeId || selectedPortalOfficeId)).map((staff, idx) => (
                                                            <tr key={idx} className="border-b border-slate-50">
                                                                <td className="py-3 px-3 font-bold text-slate-850 dark:text-white">{staff.name}</td>
                                                                <td className="py-3 px-3 text-slate-600 dark:text-slate-350">{staff.phoneNumber || 'N/A'}</td>
                                                                <td className="py-3 px-3 text-slate-500 font-mono">{staff.email}</td>
                                                            </tr>
                                                        ))}
                                                        {users.filter(u => u.metadata?.officeId === (currentUser?.metadata?.officeId || selectedPortalOfficeId)).length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="py-6 text-center text-slate-400 font-medium text-xs">No registered staff members found for this office suite.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Security Gate Check-in Logs for staff */}
                                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight font-black">Staff Entry & Exit Check-in History</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 text-[9px] text-slate-400 uppercase font-black tracking-wider">
                                                            <th className="py-2.5 px-3">Staff Name</th>
                                                            <th className="py-2.5 px-3">Gate In Time</th>
                                                            <th className="py-2.5 px-3">Gate Out Time</th>
                                                            <th className="py-2.5 px-3">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {visitorLogs.filter(log => log.officeId === (currentUser?.metadata?.officeId || selectedPortalOfficeId) && log.purpose === 'Staff Entry').map((log, idx) => (
                                                            <tr key={idx} className="border-b border-slate-50">
                                                                <td className="py-3 px-3 font-bold text-slate-800 dark:text-white">{log.visitorName}</td>
                                                                <td className="py-3 px-3 font-mono">{log.timeIn || '—'}</td>
                                                                <td className="py-3 px-3 font-mono">{log.timeOut || '—'}</td>
                                                                <td className="py-3 px-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                                        log.status === 'checked_in' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                                                    }`}>
                                                                        {log.status === 'checked_in' ? 'Inside Building' : 'Left Building'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {visitorLogs.filter(log => log.officeId === (currentUser?.metadata?.officeId || selectedPortalOfficeId) && log.purpose === 'Staff Entry').length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="py-6 text-center text-slate-400 font-medium text-xs">No entry logs registered for office employees.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 py-16 text-center rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-slate-400 font-medium text-xs">
                            Select an office workspace from the dropdown list above to access visitor approval pings and staff registration databases.
                        </div>
                    )}
                </div>
            )}

            {/* --- FLOOR MODAL --- */}
            {showFloorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <form onSubmit={handleSaveFloorSubmit} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Register Floor</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure a new building level segment</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Floor Level Number</label>
                                    <input 
                                        type="number" 
                                        value={floorNum}
                                        onChange={(e) => setFloorNum(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Floor Label Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 4th Floor"
                                        value={floorName}
                                        onChange={(e) => setFloorName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Notes</label>
                                <textarea 
                                    placeholder="Optional details..."
                                    value={floorDesc}
                                    onChange={(e) => setFloorDesc(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50">
                            <button type="button" onClick={() => setShowFloorModal(false)} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</button>
                            <button type="submit" disabled={isSavingFloor} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">{isSavingFloor ? 'Saving...' : 'Register Floor'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- OFFICE MODAL --- */}
            {showOfficeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <form onSubmit={handleSaveOfficeSubmit} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Register Office Suite</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Add a tenant occupier to the directory</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Floor Level *</label>
                                    <select
                                        value={selectedFloorId}
                                        onChange={(e) => setSelectedFloorId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    >
                                        <option value="">-- Choose Floor --</option>
                                        {floors.map(f => (
                                            <option key={f.id} value={f.id}>{f.floorName} (Level {f.floorNumber})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Office / Suite Number *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Suite 305"
                                        value={officeNum}
                                        onChange={(e) => setOfficeNum(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tenant Occupier / Company Name *</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Icona AI Solutions"
                                    value={tenantName}
                                    onChange={(e) => setTenantName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Host / Contact Person *</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Samuel Mutua"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Host Phone Number *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 0712345678"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Host Email Address</label>
                                    <input 
                                        type="email" 
                                        placeholder="e.g. sam@icona.ai"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50">
                            <button type="button" onClick={() => setShowOfficeModal(false)} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</button>
                            <button type="submit" disabled={isSavingOffice} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">{isSavingOffice ? 'Saving...' : 'Register Suite'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- VISITOR CHECKIN MODAL --- */}
            {showCheckinModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <form onSubmit={handleRegisterVisitorSubmit} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">New Visitor Check-In</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Register arriving walk-in visitor details at reception desk</p>
                            </div>
                        </div>
                        
                        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visitor Full Name *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. John Doe"
                                        value={visitorName}
                                        onChange={(e) => setVisitorName(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Visitor Phone Number *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 0712345678"
                                        value={visitorPhone}
                                        onChange={(e) => setVisitorPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">National ID / Passport No *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 34567890"
                                        value={visitorIdCard}
                                        onChange={(e) => setVisitorIdCard(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle Plate (If applicable)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. KCD 123A"
                                        value={visitorPlate}
                                        onChange={(e) => setVisitorPlate(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination Office Suite</label>
                                    <select
                                        value={visitorOfficeId}
                                        onChange={(e) => setVisitorOfficeId(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                    >
                                        <option value="">-- General Reception / Building Admin --</option>
                                        {offices.map(o => (
                                            <option key={o.id} value={o.id}>{o.officeNumber} ({o.tenantName})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose of Visit *</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Business Meeting"
                                        value={visitorPurpose}
                                        onChange={(e) => setVisitorPurpose(e.target.value)}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Assets Luggage Adding */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 p-6 space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Log Electronics / Luggage Items</span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Item Name (e.g. Laptop)"
                                        value={newAssetName}
                                        onChange={(e) => setNewAssetName(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Serial Number (S/N)"
                                        value={newAssetSerial}
                                        onChange={(e) => setNewAssetSerial(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleAddAssetItem}
                                        className="py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-650 transition-colors"
                                    >
                                        Add Item
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    {checkinAssets.map((asset, aIdx) => (
                                        <div key={aIdx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs font-semibold">
                                            <div>
                                                <span>{asset.itemName}</span>
                                                {asset.serialNumber && <span className="text-[10px] text-slate-400 font-mono ml-2">S/N: {asset.serialNumber}</span>}
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveAssetItem(aIdx)}
                                                className="text-rose-600 hover:text-rose-700 uppercase font-black text-[9px] tracking-wider"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50">
                            <button type="button" onClick={() => setShowCheckinModal(false)} className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</button>
                            <button type="submit" disabled={isSavingVisitor} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">{isSavingVisitor ? 'Registering...' : 'Register Visitor'}</button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
};
