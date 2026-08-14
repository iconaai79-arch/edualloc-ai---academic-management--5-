import React, { useState, useEffect, useMemo } from 'react';
import { User, Institution } from '../../types';
import { ShieldIcon } from '../icons/ShieldIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { HomeIcon } from '../icons/HomeIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { AlertTriangleIcon as ExclamationTriangleIcon } from '../icons/AlertTriangleIcon';
import { DownloadIcon as ArrowDownTrayIcon } from '../icons/DownloadIcon';
import { XIcon } from '../icons/XIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { apiService } from '../../services/apiService';
import { escapeHtml } from '../../utils/securityUtils';

interface PrivateSecurityCompanyViewProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction?: (action: string) => Promise<void>;
}

// ── TYPES ──
interface SecurityGuard {
    id: string;
    guardCode: string;
    name: string;
    phone: string;
    rank: 'Corporal' | 'Sergeant' | 'Guard' | 'Patrol Rover' | 'K-9 Handler';
    assignedSite: string;
    shift: 'Day Shift (06:00 - 18:00)' | 'Night Shift (18:00 - 06:00)';
    clockInStatus: 'CLOCKED_IN' | 'OFF_DUTY' | 'LATE' | 'PATROL_ACTIVE';
    lastPatrolScan: string;
    vettedStatus: 'VETTED_POLICE_CLEARED' | 'PENDING_RE-VETTING';
}

interface GuardPatrolScan {
    id: string;
    guardId: string;
    guardName: string;
    siteName: string;
    checkpointName: string;
    scanMethod: 'NFC_TAG' | 'QR_CODE' | 'GPS_GEOFENCE';
    timestamp: string;
    status: 'VERIFIED' | 'DELAYED_SCAN' | 'MISSED';
}

interface RapidResponseUnit {
    id: string;
    vehicleCode: string; // e.g. RRU-04
    driverName: string;
    commanderName: string;
    currentLocation: string;
    status: 'STANDBY_BASE' | 'DISPATCHED_EN_ROUTE' | 'ON_SCENE' | 'MAINTENANCE';
    assignedIncidentId?: string;
}

interface OccurrenceBookEntry {
    id: string;
    obNumber: string; // e.g. OB-2026-0814-001
    siteName: string;
    reportedBy: string;
    category: 'Security Breach' | 'Suspicious Person' | 'Property Damage' | 'Routine Patrol Log' | 'Alarm Trigger';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    details: string;
    actionTaken: string;
    timestamp: string;
    policeObRef?: string;
}

interface ArmoryEquipment {
    id: string;
    itemCode: string;
    itemName: string;
    category: 'Firearm' | 'Ammunition' | 'Walkie-Talkie' | 'Bodycam' | 'Bulletproof Vest' | 'Metal Detector';
    serialNumber: string;
    assignedToGuardName?: string;
    status: 'ARMORY_IN_STORE' | 'ISSUED_ON_DUTY' | 'UNDER_REPAIR';
    lastInspected: string;
}

interface ClientSiteContract {
    id: string;
    clientName: string;
    siteName: string;
    location: string;
    contactPerson: string;
    phone: string;
    dayGuardsRequired: number;
    nightGuardsRequired: number;
    monthlyContractFee: number;
    paymentStatus: 'PAID_CURRENT' | 'OVERDUE_ARREARS' | 'PENDING_INVOICE';
}

export const PrivateSecurityCompanyView: React.FC<PrivateSecurityCompanyViewProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [activeTab, setActiveTab] = useState<'roster' | 'warroom' | 'ob' | 'armory' | 'clients'>('roster');
    const [loading, setLoading] = useState(true);

    // Dynamic Lists
    const [guards, setGuards] = useState<SecurityGuard[]>([]);
    const [patrolScans, setPatrolScans] = useState<GuardPatrolScan[]>([]);
    const [responseUnits, setResponseUnits] = useState<RapidResponseUnit[]>([]);
    const [obEntries, setObEntries] = useState<OccurrenceBookEntry[]>([]);
    const [armoryItems, setArmoryItems] = useState<ArmoryEquipment[]>([]);
    const [clientContracts, setClientContracts] = useState<ClientSiteContract[]>([]);

    // Modals
    const [isObModalOpen, setIsObModalOpen] = useState(false);
    const [newObCategory, setNewObCategory] = useState<OccurrenceBookEntry['category']>('Security Breach');
    const [newObSeverity, setNewObSeverity] = useState<OccurrenceBookEntry['severity']>('MEDIUM');
    const [newObSite, setNewObSite] = useState('');
    const [newObDetails, setNewObDetails] = useState('');
    const [newObAction, setNewObAction] = useState('');
    const [newObPoliceRef, setNewObPoliceRef] = useState('');

    // Alarm Trigger State
    const [panicAlertActive, setPanicAlertActive] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    useEffect(() => {
        loadSecurityData();
    }, [currentInstitution.id]);

    const loadSecurityData = async () => {
        setLoading(true);
        try {
            // Mock & Fetch real records from apiService
            const [fetchedGuards, fetchedOb, fetchedContracts] = await Promise.all([
                apiService.fetchModuleRecords<SecurityGuard>('security_guards', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<OccurrenceBookEntry>('occurrence_book', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<ClientSiteContract>('client_site_contracts', currentInstitution.id).catch(() => [])
            ]);

            // Default fallback sample data for Security Companies if table is fresh
            if (fetchedGuards.length === 0) {
                setGuards([
                    { id: 'g1', guardCode: 'SGC-8801', name: 'John Kiprono', phone: '+254 712 345 678', rank: 'Sergeant', assignedSite: 'Stanbic Bank - Westlands', shift: 'Night Shift (18:00 - 06:00)', clockInStatus: 'PATROL_ACTIVE', lastPatrolScan: '10 mins ago (NFC Tag Post #3)', vettedStatus: 'VETTED_POLICE_CLEARED' },
                    { id: 'g2', guardCode: 'SGC-8802', name: 'Samuel Otieno', phone: '+254 722 987 654', rank: 'Corporal', assignedSite: 'Kilimani Heights Apartments', shift: 'Night Shift (18:00 - 06:00)', clockInStatus: 'CLOCKED_IN', lastPatrolScan: '25 mins ago (Gate A Scanner)', vettedStatus: 'VETTED_POLICE_CLEARED' },
                    { id: 'g3', guardCode: 'SGC-8803', name: 'Mary Wambui', phone: '+254 733 112 233', rank: 'Guard', assignedSite: 'Two Rivers Mall Entrance 2', shift: 'Day Shift (06:00 - 18:00)', clockInStatus: 'CLOCKED_IN', lastPatrolScan: '05 mins ago (NFC QR #1)', vettedStatus: 'VETTED_POLICE_CLEARED' },
                    { id: 'g4', guardCode: 'SGC-8804', name: 'David Mutua', phone: '+254 701 445 566', rank: 'Patrol Rover', assignedSite: 'Mobile Patrol Route B', shift: 'Night Shift (18:00 - 06:00)', clockInStatus: 'PATROL_ACTIVE', lastPatrolScan: 'Just now (GPS Geofence Scan)', vettedStatus: 'VETTED_POLICE_CLEARED' }
                ]);
            } else {
                setGuards(fetchedGuards);
            }

            setPatrolScans([
                { id: 'ps1', guardId: 'g1', guardName: 'John Kiprono', siteName: 'Stanbic Bank - Westlands', checkpointName: 'Vault Perimeter Tag #04', scanMethod: 'NFC_TAG', timestamp: new Date(Date.now() - 10 * 60000).toLocaleTimeString(), status: 'VERIFIED' },
                { id: 'ps2', guardId: 'g2', guardName: 'Samuel Otieno', siteName: 'Kilimani Heights Apartments', checkpointName: 'Main Vehicle Barrier', scanMethod: 'QR_CODE', timestamp: new Date(Date.now() - 25 * 60000).toLocaleTimeString(), status: 'VERIFIED' },
                { id: 'ps3', guardId: 'g4', guardName: 'David Mutua', siteName: 'Mobile Patrol Route B', checkpointName: 'Substation Gate South', scanMethod: 'GPS_GEOFENCE', timestamp: new Date(Date.now() - 2 * 60000).toLocaleTimeString(), status: 'VERIFIED' }
            ]);

            setResponseUnits([
                { id: 'rru1', vehicleCode: 'KCA 780Z (RRU Alpha)', driverName: 'Officer Patrick Kimani', commanderName: 'Captain James Oduor', currentLocation: 'Westlands Patrol Zone', status: 'STANDBY_BASE' },
                { id: 'rru2', vehicleCode: 'KDD 412X (RRU Bravo)', driverName: 'Officer Alex Nderitu', commanderName: 'Inspector Kevin Ruto', currentLocation: 'Kilimani / Hurlingham Axis', status: 'STANDBY_BASE' }
            ]);

            if (fetchedOb.length === 0) {
                setObEntries([
                    { id: 'ob1', obNumber: 'OB-2026-0814-001', siteName: 'Stanbic Bank - Westlands', reportedBy: 'Sgt. John Kiprono', category: 'Security Breach', severity: 'HIGH', details: 'Unidentified vehicle parked outside bank perimeter fence with headlights turned off at 02:15 AM.', actionTaken: 'Challenged driver, dispatched RRU Alpha. Driver identified as utility technician with valid ID.', timestamp: '2026-08-14 02:20 AM', policeObRef: 'Parklands Police OB/45/14/08/2026' },
                    { id: 'ob2', obNumber: 'OB-2026-0814-002', siteName: 'Kilimani Heights Apartments', reportedBy: 'Cpl. Samuel Otieno', category: 'Routine Patrol Log', severity: 'LOW', details: 'All 12 perimeter wall electric fence wires tested and fully operational (Output 9.8kV).', actionTaken: 'Routine log recorded in shift book.', timestamp: '2026-08-14 04:00 AM' }
                ]);
            } else {
                setObEntries(fetchedOb);
            }

            setArmoryItems([
                { id: 'arm1', itemCode: 'ARM-GLK-01', itemName: 'Glock 17 9mm Pistol', category: 'Firearm', serialNumber: 'GLK-908122-KE', assignedToGuardName: 'Sgt. John Kiprono', status: 'ISSUED_ON_DUTY', lastInspected: '2026-08-14' },
                { id: 'arm2', itemCode: 'ARM-WT-04', itemName: 'Motorola Digital Walkie-Talkie Radio', category: 'Walkie-Talkie', serialNumber: 'MOT-7821-X', assignedToGuardName: 'Cpl. Samuel Otieno', status: 'ISSUED_ON_DUTY', lastInspected: '2026-08-14' },
                { id: 'arm3', itemCode: 'ARM-CAM-12', itemName: 'HD Night-Vision Bodycam 4K', category: 'Bodycam', serialNumber: 'BCAM-9912', status: 'ARMORY_IN_STORE', lastInspected: '2026-08-13' }
            ]);

            if (fetchedContracts.length === 0) {
                setClientContracts([
                    { id: 'c1', clientName: 'Stanbic Bank Kenya Ltd', siteName: 'Westlands Branch', location: 'Waiyaki Way, Westlands', contactPerson: 'Bernard Musyoka (Security Manager)', phone: '+254 720 000 111', dayGuardsRequired: 4, nightGuardsRequired: 6, monthlyContractFee: 450000, paymentStatus: 'PAID_CURRENT' },
                    { id: 'c2', clientName: 'Kilimani Heights Management', siteName: 'Residential Towers', location: 'Kindaruma Road, Kilimani', contactPerson: 'Jane Kariuki (Chairperson)', phone: '+254 733 999 888', dayGuardsRequired: 2, nightGuardsRequired: 4, monthlyContractFee: 270000, paymentStatus: 'OVERDUE_ARREARS' }
                ]);
            } else {
                setClientContracts(fetchedContracts);
            }

        } catch (err) {
            console.error('Failed to load security company data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Trigger Emergency SOS Panic Dispatch
    const handleTriggerPanicDispatch = async (siteName: string) => {
        setPanicAlertActive(true);
        setAlertMessage(`🚨 EMERGENCY SOS TRIGGERED FOR: ${siteName}! Rapid Response Unit Alpha Dispatched!`);
        
        // Update RRU Status
        setResponseUnits(prev => prev.map(u => u.id === 'rru1' ? { ...u, status: 'DISPATCHED_EN_ROUTE', assignedIncidentId: `SOS-${Date.now()}` } : u));
        
        if (onLogAction) {
            await onLogAction(`EMERGENCY SOS DISPATCHED: Rapid Response Unit Alpha sent to ${siteName}`);
        }
    };

    // Create New Digital Occurrence Book Entry
    const handleCreateObEntry = async () => {
        if (!newObSite || !newObDetails) {
            alert('Please provide site name and incident details.');
            return;
        }

        const count = obEntries.length + 1;
        const newEntry: OccurrenceBookEntry = {
            id: `ob_${Date.now()}`,
            obNumber: `OB-2026-0814-${String(count).padStart(3, '0')}`,
            siteName: newObSite,
            reportedBy: currentUser.name,
            category: newObCategory,
            severity: newObSeverity,
            details: newObDetails,
            actionTaken: newObAction || 'Logged in Control Room OB ledger.',
            timestamp: new Date().toLocaleString('en-KE'),
            policeObRef: newObPoliceRef
        };

        const updated = [newEntry, ...obEntries];
        setObEntries(updated);

        await apiService.saveModuleRecord('occurrence_book', newEntry);
        if (onLogAction) {
            await onLogAction(`Logged Digital Occurrence Book Entry ${newEntry.obNumber} for site ${newObSite}`);
        }

        setIsObModalOpen(false);
        setNewObSite('');
        setNewObDetails('');
        setNewObAction('');
        setNewObPoliceRef('');
    };

    // Print Official Digital OB Incident Report PDF
    const handlePrintObReport = (entry: OccurrenceBookEntry) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Official Digital Occurrence Book Report - ${escapeHtml(entry.obNumber)}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; margin: 30px; color: #0f172a; }
                    .header { border-bottom: 4px solid #dc2626; padding-bottom: 15px; display: flex; justify-content: space-between; }
                    .title { font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0; color: #991b1b; }
                    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 25px 0; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; }
                    .box { background: white; p-4; border-radius: 8px; padding: 15px; margin-bottom: 20px; border: 1px solid #cbd5e1; }
                    .box-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
                    .sig-section { margin-top: 50px; display: flex; justify-content: space-between; }
                    .sig-box { border-top: 1px solid #64748b; width: 220px; text-align: center; font-size: 11px; font-weight: bold; padding-top: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="title">${escapeHtml(currentInstitution.name)}</h1>
                        <p style="margin: 3px 0; font-size: 13px; font-weight: bold; color: #475569;">Private Security & Guarding Operations Division</p>
                        <p style="margin: 0; font-size: 11px; color: #64748b;">Digital Incident & Occurrence Book Statement</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 8px; font-weight: 900; font-size: 14px;">
                            ${escapeHtml(entry.obNumber)}
                        </span>
                        <p style="font-size: 10px; color: #64748b; margin-top: 6px;">Logged: ${escapeHtml(entry.timestamp)}</p>
                    </div>
                </div>

                <div class="meta-grid">
                    <div><strong>CLIENT SITE:</strong> ${escapeHtml(entry.siteName)}</div>
                    <div><strong>INCIDENT CATEGORY:</strong> ${escapeHtml(entry.category)}</div>
                    <div><strong>SEVERITY LEVEL:</strong> ${escapeHtml(entry.severity)}</div>
                    <div><strong>REPORTING OFFICER:</strong> ${escapeHtml(entry.reportedBy)}</div>
                    ${entry.policeObRef ? `<div><strong>POLICE OB REF:</strong> ${escapeHtml(entry.policeObRef)}</div>` : ''}
                </div>

                <div class="box">
                    <div class="box-title">Incident Details & Observations</div>
                    <p style="font-size: 13px; line-height: 1.6; margin: 0;">${escapeHtml(entry.details)}</p>
                </div>

                <div class="box">
                    <div class="box-title">Action Taken & Resolution</div>
                    <p style="font-size: 13px; line-height: 1.6; margin: 0; color: #16a34a; font-weight: bold;">${escapeHtml(entry.actionTaken)}</p>
                </div>

                <div class="sig-section">
                    <div class="sig-box">Duty Officer / Guard Signature</div>
                    <div class="sig-box">Security Operations Director</div>
                    <div style="border: 2px dashed #94a3b8; width: 90px; height: 90px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: #94a3b8;">
                        OFFICIAL SECURITY STAMP
                    </div>
                </div>

                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-400 animate-pulse font-medium">
                Initializing Private Security Control Room Operations...
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 text-left">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-950 via-rose-950 to-slate-900 border border-rose-900/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30 text-[10px] font-black uppercase tracking-widest mb-3">
                            <ShieldIcon className="w-3.5 h-3.5" />
                            <span>Private Security & Rapid Response Suite</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                            Security Company Control Room Master
                        </h1>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            Guard Shift Rostering, Real-Time NFC Patrol Watch, SOS Panic Dispatch & Digital OB Logbook for {currentInstitution.name}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => handleTriggerPanicDispatch('Stanbic Bank Westlands (Manual Test Alert)')}
                            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all cursor-pointer animate-pulse"
                        >
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            <span>🚨 Trigger SOS Panic Alert</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsObModalOpen(true)}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Log Digital OB Entry</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Emergency Alert Toast */}
            {panicAlertActive && (
                <div className="p-4 bg-rose-950 border border-rose-600 rounded-2xl text-rose-200 font-black text-xs flex justify-between items-center animate-bounce shadow-2xl">
                    <div className="flex items-center gap-3">
                        <ExclamationTriangleIcon className="w-6 h-6 text-rose-400 shrink-0" />
                        <span>{alertMessage}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setPanicAlertActive(false)}
                        className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-[10px] uppercase font-bold"
                    >
                        Acknowledge & Clear
                    </button>
                </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Active Guards</span>
                    <p className="text-2xl font-black text-white">{guards.length}</p>
                    <p className="text-[10px] text-emerald-400 font-bold">100% Vetted & Police Cleared</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified Patrol Scans Today</span>
                    <p className="text-2xl font-black text-indigo-400">{patrolScans.length} Scans</p>
                    <p className="text-[10px] text-indigo-300 font-medium">NFC Tag + GPS Geofenced</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rapid Response Vehicles</span>
                    <p className="text-2xl font-black text-emerald-400">{responseUnits.length} Units</p>
                    <p className="text-[10px] text-slate-500 font-medium">GPS Tracked & Tactical Crew</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Digital OB Incidents</span>
                    <p className="text-2xl font-black text-rose-400">{obEntries.length} Logged</p>
                    <p className="text-[10px] text-rose-500/80 font-bold">Police Formatted Reports</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveTab('roster')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'roster' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                    🛡️ Guard Shift Roster & Patrol Watch
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('warroom')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'warroom' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                    🚨 Control Room War Room & RRU
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('ob')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'ob' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                    📋 Digital Occurrence Book (OB)
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('armory')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'armory' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                    🔫 Armory & Tactical Gear
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('clients')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'clients' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                    💼 Client Sites & Invoicing
                </button>
            </div>

            {/* TAB 1: Guard Shift Roster & Patrol Watch */}
            {activeTab === 'roster' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black uppercase text-white tracking-tight">Active Guard Shift Roster & Live NFC Checkpoint Logs</h3>
                            <p className="text-xs text-slate-400">Real-time status of stationed security guards and verified patrol tour scans</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-800">
                                    <th className="p-4">Guard Details</th>
                                    <th className="p-4">Assigned Site</th>
                                    <th className="p-4">Shift & Rank</th>
                                    <th className="p-4">Clock-In & Patrol Status</th>
                                    <th className="p-4">Police Vetting Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-xs">
                                {guards.map(g => (
                                    <tr key={g.id} className="hover:bg-slate-800/40 transition-all">
                                        <td className="p-4">
                                            <p className="font-black text-white">{g.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{g.guardCode} · {g.phone}</p>
                                        </td>
                                        <td className="p-4 font-bold text-rose-300">
                                            {g.assignedSite}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-200">{g.rank}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">{g.shift}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                g.clockInStatus === 'PATROL_ACTIVE' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/40' :
                                                g.clockInStatus === 'CLOCKED_IN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                                                'bg-slate-800 text-slate-400'
                                            }`}>
                                                {g.clockInStatus.replace('_', ' ')}
                                            </span>
                                            <p className="text-[10px] text-slate-400 font-mono mt-1">{g.lastPatrolScan}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">
                                                <CheckCircleIcon className="w-3 h-3" />
                                                <span>Police Cleared</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: Control Room War Room & RRU */}
            {activeTab === 'warroom' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-black uppercase text-white tracking-tight">Control Room War Room & Rapid Response Units (RRU)</h3>
                        <p className="text-xs text-slate-400">Tactical fleet monitoring and automated panic response dispatch center</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {responseUnits.map(unit => (
                            <div key={unit.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="px-2 py-0.5 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-full text-[9px] font-black uppercase">
                                            Tactical Patrol Car
                                        </span>
                                        <h4 className="text-base font-black text-white mt-1">{unit.vehicleCode}</h4>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                        unit.status === 'STANDBY_BASE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40 animate-pulse'
                                    }`}>
                                        {unit.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-xs space-y-1 text-slate-300">
                                    <p><strong>Commander:</strong> {unit.commanderName}</p>
                                    <p><strong>Tactical Driver:</strong> {unit.driverName}</p>
                                    <p><strong>Current Sector:</strong> <span className="text-indigo-400 font-mono">{unit.currentLocation}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: Digital Occurrence Book (OB) */}
            {activeTab === 'ob' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black uppercase text-white tracking-tight">Digital Occurrence Book (OB) Ledger</h3>
                            <p className="text-xs text-slate-400">Official digital security logs formatted for Police reporting & insurance claims</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsObModalOpen(true)}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>New OB Log</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {obEntries.map(ob => (
                            <div key={ob.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-xl text-xs font-mono font-black">
                                            {ob.obNumber}
                                        </span>
                                        <div>
                                            <h4 className="text-sm font-black text-white">{ob.siteName}</h4>
                                            <p className="text-[10px] text-slate-500 font-mono">Logged by {ob.reportedBy} · {ob.timestamp}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                            ob.severity === 'HIGH' || ob.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border border-rose-800/40' : 'bg-slate-800 text-slate-300'
                                        }`}>
                                            {ob.severity} Severity
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handlePrintObReport(ob)}
                                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                                        >
                                            <PrinterIcon className="w-3.5 h-3.5" />
                                            <span>Print Report</span>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                                    {ob.details}
                                </p>
                                <p className="text-xs text-emerald-400 font-bold">
                                    Action Taken: {ob.actionTaken}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 4: Armory & Tactical Gear */}
            {activeTab === 'armory' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-black uppercase text-white tracking-tight">Armory Firearms & Tactical Equipment Ledger</h3>
                        <p className="text-xs text-slate-400">Strict check-in and check-out tracking for firearms, radios, bodycams & body armor</p>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-800">
                                    <th className="p-4">Item Code & Name</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Serial Number</th>
                                    <th className="p-4">Assigned Guard</th>
                                    <th className="p-4">Armory Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-xs">
                                {armoryItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-800/40 transition-all">
                                        <td className="p-4">
                                            <p className="font-black text-white">{item.itemName}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{item.itemCode}</p>
                                        </td>
                                        <td className="p-4 font-bold text-slate-300">
                                            {item.category}
                                        </td>
                                        <td className="p-4 font-mono text-indigo-400">
                                            {item.serialNumber}
                                        </td>
                                        <td className="p-4 text-slate-300">
                                            {item.assignedToGuardName || '— In Armory Store —'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                item.status === 'ISSUED_ON_DUTY' ? 'bg-amber-950 text-amber-400 border border-amber-800/40' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                            }`}>
                                                {item.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 5: Client Sites & Invoicing */}
            {activeTab === 'clients' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-black uppercase text-white tracking-tight">Client Site Guard Contracts & Invoicing</h3>
                        <p className="text-xs text-slate-400">Contracted guard allocations and monthly M-Pesa / Bank billing for client properties</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clientContracts.map(c => (
                            <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-base font-black text-white">{c.clientName}</h4>
                                        <p className="text-xs text-indigo-300 font-bold">{c.siteName} · {c.location}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                        c.paymentStatus === 'PAID_CURRENT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                                    }`}>
                                        {c.paymentStatus.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-xs space-y-1 text-slate-300 pt-2 border-t border-slate-800/60">
                                    <p><strong>Guard Allocation:</strong> {c.dayGuardsRequired} Day Guards + {c.nightGuardsRequired} Night Guards</p>
                                    <p><strong>Contact Person:</strong> {c.contactPerson} ({c.phone})</p>
                                    <p><strong>Monthly Contract Fee:</strong> <span className="text-emerald-400 font-black font-mono">KSh {c.monthlyContractFee.toLocaleString()}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for Creating Digital OB Log */}
            {isObModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 text-left shadow-2xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-3 py-1 bg-rose-950 text-rose-400 border border-rose-800/40 rounded-full text-[9px] font-black uppercase mb-2">
                                    Security Operations Book
                                </span>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                    Log Digital Occurrence Book (OB) Entry
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsObModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Target Client Site Name</label>
                                <input
                                    type="text"
                                    value={newObSite}
                                    onChange={(e) => setNewObSite(e.target.value)}
                                    placeholder="e.g. Stanbic Bank Westlands"
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-rose-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Incident Category</label>
                                    <select
                                        value={newObCategory}
                                        onChange={(e) => setNewObCategory(e.target.value as any)}
                                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-bold"
                                    >
                                        <option value="Security Breach">Security Breach</option>
                                        <option value="Suspicious Person">Suspicious Person</option>
                                        <option value="Property Damage">Property Damage</option>
                                        <option value="Routine Patrol Log">Routine Patrol Log</option>
                                        <option value="Alarm Trigger">Alarm Trigger</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Severity Level</label>
                                    <select
                                        value={newObSeverity}
                                        onChange={(e) => setNewObSeverity(e.target.value as any)}
                                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-bold"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Detailed Incident Description</label>
                                <textarea
                                    rows={3}
                                    value={newObDetails}
                                    onChange={(e) => setNewObDetails(e.target.value)}
                                    placeholder="Describe observations, time of occurrence, personnel involved..."
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Action Taken & Resolution</label>
                                <input
                                    type="text"
                                    value={newObAction}
                                    onChange={(e) => setNewObAction(e.target.value)}
                                    placeholder="e.g. Dispatched RRU Alpha, informed client security manager"
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-rose-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Police OB Reference (Optional)</label>
                                <input
                                    type="text"
                                    value={newObPoliceRef}
                                    onChange={(e) => setNewObPoliceRef(e.target.value)}
                                    placeholder="e.g. Parklands Police OB/45/14/08/2026"
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsObModalOpen(false)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateObEntry}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-600/30"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Save Digital OB Entry</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrivateSecurityCompanyView;
