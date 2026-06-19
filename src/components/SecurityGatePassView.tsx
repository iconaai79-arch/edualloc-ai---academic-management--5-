import React, { useState, useEffect } from 'react';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { TruckIcon } from './icons/TruckIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserIcon } from './icons/UserIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

import type { TransportVehicle, VehicleLog, User, Institution, Visitor, Course } from '../types';
import { apiService } from '../services/apiService';

export const printEposGatePass = (pin: any, parent: any, event: any, institution: any) => {
    const guests = (() => {
        try {
            const parsed = JSON.parse(pin.guests || '[]');
            return Array.isArray(parsed) ? parsed.filter((g: any) => typeof g === 'string' && g.trim()) : [];
        } catch (e) {
            return pin.guests && typeof pin.guests === 'string' && pin.guests.trim() ? [pin.guests.trim()] : [];
        }
    })();

    const timestamp = new Date().toLocaleString();

    const printWin = window.open('', '_blank', 'width=400,height=600,toolbar=0,menubar=0,scrollbars=0');
    if (!printWin) return;

    const htmlContent = `
        <html>
        <head>
            <style>
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                body {
                    width: 72mm;
                    margin: 0 auto;
                    padding: 5mm 0;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 11px;
                    line-height: 1.3;
                    color: #000;
                    background-color: #fff;
                }
                .text-center {
                    text-align: center;
                }
                .bold {
                    font-weight: bold;
                }
                .title {
                    font-size: 14px;
                    margin: 4px 0;
                    text-transform: uppercase;
                }
                .subtitle {
                    font-size: 11px;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                .separator {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                }
                .info-table {
                    width: 100%;
                    margin-bottom: 8px;
                }
                .info-table td {
                    padding: 2px 0;
                    vertical-align: top;
                }
                .info-label {
                    width: 40%;
                }
                .guests-title {
                    margin-top: 8px;
                    text-transform: uppercase;
                }
                .guest-item {
                    padding: 2px 0;
                }
                .footer {
                    margin-top: 15px;
                    font-size: 9px;
                }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="bold title">${institution?.name || 'Academic Institution'}</div>
                <div class="subtitle">Gate Entry Pass</div>
                <div class="separator"></div>
                <div class="bold" style="font-size: 12px; margin: 5px 0;">EVENT CHECK-IN PASS</div>
                <div class="separator"></div>
            </div>

            <table class="info-table">
                <tr>
                    <td class="info-label bold">EVENT:</td>
                    <td>${event?.title || 'School Event'}</td>
                </tr>
                <tr>
                    <td class="info-label bold">HOLDER:</td>
                    <td>${parent?.name || 'Invited Guest'}</td>
                </tr>
                <tr>
                    <td class="info-label bold">PHONE:</td>
                    <td>${parent?.phoneNumber || parent?.phone_number || 'N/A'}</td>
                </tr>
                ${pin.vehicleRegistration || pin.vehicle_registration ? `
                <tr>
                    <td class="info-label bold">VEHICLE:</td>
                    <td class="bold">${pin.vehicleRegistration || pin.vehicle_registration}</td>
                </tr>
                ` : ''}
                <tr>
                    <td class="info-label bold">TIME:</td>
                    <td>${timestamp}</td>
                </tr>
                <tr>
                    <td class="info-label bold">PIN CODE:</td>
                    <td class="bold">${pin.pin}</td>
                </tr>
            </table>

            <div class="separator"></div>

            <div class="bold guests-title">Accompanying Guests (${guests.length}):</div>
            ${guests.length > 0 
                ? guests.map((g: string, idx: number) => `<div class="guest-item">${idx + 1}. ${g}</div>`).join('')
                : '<div class="guest-item">No accompanying guests</div>'
            }

            <div class="separator"></div>

            <div class="text-center footer">
                <div class="bold">ENTRY APPROVED</div>
                <div style="margin-top: 4px;">Thank you for attending.</div>
                <div style="font-size: 8px; margin-top: 6px; color: #555;">Powered by Edualloc-AI</div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
};

export const printEposWalkInGatePass = (visitor: any, host: any, institution: any, hostSignature?: string, visitorSignature?: string) => {
    const timestamp = new Date().toLocaleString();

    const innerHtml = `
        <div style="text-align:center;">
            <div style="font-weight:bold;font-size:14px;text-transform:uppercase;margin:4px 0;">${institution?.name || 'Academic Institution'}</div>
            <div style="font-size:11px;text-transform:uppercase;margin-bottom:8px;">Gate Entry Pass</div>
            <div style="border-top:1px dashed #000;margin:8px 0;"></div>
            <div style="font-weight:bold;font-size:12px;margin:5px 0;">WALK-IN VISITOR PASS</div>
            <div style="border-top:1px dashed #000;margin:8px 0;"></div>
        </div>

        <table style="width:100%;margin-bottom:8px;font-size:11px;">
            <tr><td style="width:40%;font-weight:bold;padding:2px 0;vertical-align:top;">VISITOR:</td><td style="padding:2px 0;">${visitor?.name || 'Unknown Visitor'}</td></tr>
            <tr><td style="font-weight:bold;padding:2px 0;vertical-align:top;">PHONE:</td><td style="padding:2px 0;">${visitor?.phoneNumber || visitor?.phone || 'N/A'}</td></tr>
            ${visitor?.idNumber ? `<tr><td style="font-weight:bold;padding:2px 0;vertical-align:top;">ID/REF:</td><td style="padding:2px 0;">${visitor.idNumber}</td></tr>` : ''}
            <tr><td style="font-weight:bold;padding:2px 0;vertical-align:top;">PURPOSE:</td><td style="padding:2px 0;">${visitor?.purpose || 'N/A'}</td></tr>
            <tr><td style="font-weight:bold;padding:2px 0;vertical-align:top;">HOST:</td><td style="padding:2px 0;">${visitor?.hostName || host?.name || 'N/A'}</td></tr>
            ${visitor?.vehiclePlate ? `<tr><td style="font-weight:bold;padding:2px 0;vertical-align:top;">VEHICLE:</td><td style="font-weight:bold;padding:2px 0;">${visitor.vehiclePlate}${visitor.vehicleModel ? ` (${visitor.vehicleModel})` : ''}</td></tr>` : ''}
            <tr><td style="font-weight:bold;padding:2px 0;vertical-align:top;">TIME:</td><td style="padding:2px 0;">${timestamp}</td></tr>
        </table>

        <div style="border-top:1px dashed #000;margin:8px 0;"></div>

        <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr>
                <td style="width:50%;vertical-align:top;padding:0 2px;">
                    <div style="font-size:9px;font-weight:bold;text-transform:uppercase;margin-bottom:3px;">Visitor Signature:</div>
                    ${visitorSignature
                        ? `<img src="${visitorSignature}" style="width:100%;max-height:45px;object-fit:contain;border-bottom:1px solid #000;display:block;" alt="Visitor Signature" />`
                        : `<div style="border-bottom:1px solid #000;height:30px;width:100%;"></div>`
                    }
                    <div style="font-size:8px;margin-top:2px;">${visitor?.name || ''}</div>
                </td>
                <td style="width:50%;vertical-align:top;padding:0 2px;">
                    <div style="font-size:9px;font-weight:bold;text-transform:uppercase;margin-bottom:3px;">Host Signature:</div>
                    ${hostSignature
                        ? `<img src="${hostSignature}" style="width:100%;max-height:45px;object-fit:contain;border-bottom:1px solid #000;display:block;" alt="Host Signature" />`
                        : `<div style="border-bottom:1px solid #000;height:30px;width:100%;"></div>`
                    }
                    <div style="font-size:8px;margin-top:2px;">${host?.name || ''}</div>
                </td>
            </tr>
        </table>

        <div style="border-top:1px dashed #000;margin:8px 0;"></div>

        <div style="text-align:center;font-size:9px;margin-top:15px;">
            <div style="font-weight:bold;">VISITOR APPROVED ENTRY</div>
            <div style="margin-top:4px;">Please keep this pass visible.</div>
            <div style="font-size:8px;margin-top:6px;color:#555;">Powered by Edualloc-AI</div>
        </div>
    `;

    // Inject a style that hides everything EXCEPT our print div during printing
    const styleTag = document.createElement('style');
    styleTag.id = '__walkin_gatepass_style__';
    styleTag.innerHTML = `
        @media print {
            body > *:not(#__walkin_gatepass_print__) { display: none !important; }
            #__walkin_gatepass_print__ {
                display: block !important;
                position: fixed !important;
                top: 0; left: 0;
                width: 72mm;
                margin: 0 auto;
                padding: 5mm 0;
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                line-height: 1.3;
                color: #000;
                background: #fff;
            }
            @page { size: 80mm auto; margin: 0; }
        }
        #__walkin_gatepass_print__ { display: none; }
    `;
    document.head.appendChild(styleTag);

    // Clean up after printing
    const cleanup = () => {
        document.getElementById('__walkin_gatepass_print__')?.remove();
        document.getElementById('__walkin_gatepass_style__')?.remove();
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    // Trigger print — no popup, no preview window
    window.print();
};

interface SecurityGatePassViewProps {
    vehicles: TransportVehicle[];
    vehicleLogs: VehicleLog[];
    users: User[];
    visitors?: Visitor[];
    currentUser: User;
    currentInstitution: Institution;
    onLogGateAction: (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => Promise<void>;
    onAddVisitor?: (visitor: Omit<Visitor, 'id'>) => Promise<void> | void;
    courses?: Course[];
}

export const SecurityGatePassView: React.FC<SecurityGatePassViewProps> = ({
    vehicles, vehicleLogs, users, visitors = [], currentUser, currentInstitution, onLogGateAction, onAddVisitor, courses = []
}) => {
    const [activeTab, setActiveTab] = useState<'vehicle' | 'parent'>('vehicle');
    const [activeUsers, setActiveUsers] = useState<User[]>(users);

    useEffect(() => {
        setActiveUsers(users);
    }, [users]);

    // Vehicle State
    const [searchTerm, setSearchTerm] = useState('');
    const [scanning, setScanning] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<TransportVehicle | null>(null);
    const [notes, setNotes] = useState('');

    // Parent State
    const [parentSearchTerm, setParentSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
    const [selectedParent, setSelectedParent] = useState<User | null>(null);
    const [selectedPin, setSelectedPin] = useState<any | null>(null);
    const [associatedEvent, setAssociatedEvent] = useState<any | null>(null);
    const [parentScanning, setParentScanning] = useState(false);
    const [scannablePins, setScannablePins] = useState<any[]>([]);
    const [loadingPins, setLoadingPins] = useState(false);
    const [scanFilter, setScanFilter] = useState('');

    const [allEventPins, setAllEventPins] = useState<any[]>([]);
    const [allEvents, setAllEvents] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchHistoryAndEvents = async () => {
        if (!currentInstitution?.id) return;
        setLoadingHistory(true);
        try {
            const [pins, evts] = await Promise.all([
                apiService.fetchModuleRecords('event_pins', currentInstitution.id),
                apiService.fetchModuleRecords('institution_events', currentInstitution.id)
            ]);
            setAllEventPins(pins || []);
            setAllEvents(evts || []);
        } catch (e) {
            console.error("Failed to fetch event pins / events history:", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistoryAndEvents();
    }, [currentInstitution?.id]);

    useEffect(() => {
        if (parentScanning) {
            const loadPins = async () => {
                setLoadingPins(true);
                try {
                    const pins = await apiService.fetchModuleRecords('event_pins', currentInstitution.id);
                    // Filter pins that are pending/accepted (not used yet)
                    const pendingPins = pins.filter((p: any) => p.status !== 'used');
                    setScannablePins(pendingPins);
                } catch (e) {
                    console.error("Failed to load pins for scanning:", e);
                } finally {
                    setLoadingPins(false);
                }
            };
            loadPins();
        }
    }, [parentScanning, currentInstitution.id]);

    const filteredVehicles = vehicles.filter(v =>
        v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Parent Search Logic
    const handleSearchParent = async (overrideTerm?: string) => {
        setSelectedPin(null);
        setAssociatedEvent(null);
        
        const activeTerm = overrideTerm !== undefined ? overrideTerm : parentSearchTerm;
        if (activeTerm.length < 3) return;
        
        const term = activeTerm.toLowerCase();

        // Fetch fresh users from the database to ensure we have the absolute latest records
        let searchUsers = activeUsers;
        try {
            const fetched = await apiService.fetchModuleRecords<User>('users', currentInstitution.id);
            if (fetched && fetched.length > 0) {
                searchUsers = fetched;
                setActiveUsers(fetched);
            }
        } catch (e) {
            console.error("Failed to query fresh users for search:", e);
        }
        
        // 0. Search by Event PIN first
        try {
            const pinRecords = await apiService.fetchModuleRecords('event_pins', currentInstitution.id, undefined, {
                filter: { pin: term.toUpperCase() }
            });

            if (pinRecords && pinRecords.length > 0) {
                const pin = pinRecords[0];
                
                // Fetch associated parent user
                let parentMatch = searchUsers.find(u => u.id === pin.userId);
                if (!parentMatch) {
                    const parentUsers = await apiService.fetchModuleRecords('users', currentInstitution.id, undefined, {
                        filter: { id: pin.userId }
                    });
                    if (parentUsers && parentUsers.length > 0) {
                        parentMatch = parentUsers[0];
                    }
                }

                const finalParent = parentMatch || ({
                    id: pin.userId,
                    name: 'Invited Guest',
                    phoneNumber: '',
                    role: 'parent',
                    institutionId: currentInstitution.id
                } as any);

                // Fetch event details
                let finalEvent = null;
                const events = await apiService.fetchModuleRecords('institution_events', currentInstitution.id, undefined, {
                    filter: { id: pin.eventId }
                });
                if (events && events.length > 0) {
                    finalEvent = events[0];
                }
                
                const childMatch = searchUsers.find(u => 
                    u.role === 'student' && (
                        u.parentIds?.includes(pin.userId) || 
                        parentMatch?.studentIds?.includes(u.id) || 
                        (u as any).parentPhone === (parentMatch?.phoneNumber || '')
                    )
                );
                const finalStudent = childMatch || null;

                // Set states so that the UI updates in case we need it (or for warning confirmation)
                setSelectedPin(pin);
                setSelectedParent(finalParent);
                setAssociatedEvent(finalEvent);
                setSelectedStudent(finalStudent);

                if (pin.status === 'used') {
                    if (!window.confirm("Warning: This PIN has already been checked in. Do you still want to grant entry and print a duplicate gatepass?")) {
                        return;
                    }
                }

                // Trigger verify and print immediately!
                await performVerificationAndPrint(pin, finalParent, finalEvent, finalStudent);
                return;
            }
        } catch (e) {
            console.error("Failed to query event PIN:", e);
        }
        
        // 1. Search by Student Admission Number or Name
        const studentMatch = searchUsers.find(u => 
            u.role === 'student' && 
            (u.admissionNumber?.toLowerCase() === term || u.admission_number?.toLowerCase() === term || u.name.toLowerCase().includes(term))
        );

        if (studentMatch) {
            setSelectedStudent(studentMatch);
            // Find parent
            let parentMatch = null;
            if (studentMatch.parentIds && studentMatch.parentIds.length > 0) {
                parentMatch = searchUsers.find(u => u.id === studentMatch.parentIds![0]);
            } else if ((studentMatch as any).parentPhone) {
                 parentMatch = searchUsers.find(u => u.role === 'parent' && u.phoneNumber === (studentMatch as any).parentPhone);
            }
            
            if (parentMatch) {
                setSelectedParent(parentMatch);
            } else if ((studentMatch as any).parentPhone) {
                 // If no user object, create a mock for display
                 parentMatch = {
                    id: 'temp',
                    name: (studentMatch as any).parentName || 'Unknown Parent',
                    phoneNumber: (studentMatch as any).parentPhone,
                    role: 'parent',
                    email: (studentMatch as any).parentEmail || '',
                    institutionId: currentInstitution.id
                 } as any;
                 setSelectedParent(parentMatch);
            }

            // Look up associated active/used PIN
            try {
                const pinRecords = await apiService.fetchModuleRecords('event_pins', currentInstitution.id);
                const activePins = pinRecords.filter(p => 
                    (p.userId === studentMatch.id || (parentMatch && p.userId === parentMatch.id))
                );
                if (activePins.length > 0) {
                    const sortedPins = [...activePins].sort((a, b) => {
                        const score = (status: string) => status === 'pending' || status === 'accepted' ? 2 : 1;
                        return score(b.status) - score(a.status);
                    });
                    const pin = sortedPins[0];
                    setSelectedPin(pin);
                    const events = await apiService.fetchModuleRecords('institution_events', currentInstitution.id, undefined, {
                        filter: { id: pin.eventId }
                    });
                    if (events && events.length > 0) {
                        setAssociatedEvent(events[0]);
                    }
                }
            } catch (e) {
                console.error("Failed to query PIN for student match:", e);
            }
            return;
        }

        // 2. Search by Parent Phone Number or Name directly
        const parentDirectMatch = searchUsers.find(u => 
            u.role === 'parent' && 
            (u.phoneNumber?.includes(term) || u.name.toLowerCase().includes(term))
        );

        if (parentDirectMatch) {
            setSelectedParent(parentDirectMatch);
            // Find associated student
            const childMatch = searchUsers.find(u => 
                u.role === 'student' && (
                    u.parentIds?.includes(parentDirectMatch.id) || 
                    parentDirectMatch.studentIds?.includes(u.id) || 
                    (u as any).parentPhone === parentDirectMatch.phoneNumber
                )
            );
            if (childMatch) {
                setSelectedStudent(childMatch);
            } else {
                setSelectedStudent(null);
            }

            // Look up associated active/used PIN
            try {
                const pinRecords = await apiService.fetchModuleRecords('event_pins', currentInstitution.id);
                const activePins = pinRecords.filter(p => 
                    (p.userId === parentDirectMatch.id || (childMatch && p.userId === childMatch.id))
                );
                if (activePins.length > 0) {
                    const sortedPins = [...activePins].sort((a, b) => {
                        const score = (status: string) => status === 'pending' || status === 'accepted' ? 2 : 1;
                        return score(b.status) - score(a.status);
                    });
                    const pin = sortedPins[0];
                    setSelectedPin(pin);
                    const events = await apiService.fetchModuleRecords('institution_events', currentInstitution.id, undefined, {
                        filter: { id: pin.eventId }
                    });
                    if (events && events.length > 0) {
                        setAssociatedEvent(events[0]);
                    }
                }
            } catch (e) {
                console.error("Failed to query PIN for parent match:", e);
            }
            return;
        }

        // Reset if nothing found
        setSelectedParent(null);
        setSelectedStudent(null);
    };

    const handleVehicleAction = async (type: 'entry' | 'exit') => {
        if (!selectedVehicle) return;
        try {
            await onLogGateAction(selectedVehicle.id, type, notes);
            setSelectedVehicle(null);
            setNotes('');
            setSearchTerm('');
            alert(`Vehicle ${type} logged successfully.`);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const performVerificationAndPrint = async (
        pin: any,
        parent: User,
        event: any,
        student: User | null
    ) => {
        if (!parent || !onAddVisitor) return;
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const timeInStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const plate = pin?.vehicleRegistration || pin?.vehicle_registration || '';

            const isSchool = ['Primary', 'Secondary', 'ECD', 'International', 'primary', 'secondary'].includes(currentInstitution?.institutionType || '') ||
                             ['Primary', 'Secondary', 'ECD', 'International', 'primary', 'secondary'].includes(currentInstitution?.category || '');

            let resolvedHostId = student?.id || currentUser.id;
            if (isSchool && student) {
                const classLevel = courses.flatMap(c => c.levels || []).find(lvl => lvl.id === student.courseLevelId);
                if (classLevel && classLevel.classTeacherId) {
                    resolvedHostId = classLevel.classTeacherId;
                } else {
                    resolvedHostId = currentUser.id;
                }
            }

            // Add the parent first
            await onAddVisitor({
                name: parent.name,
                phoneNumber: parent.phoneNumber || '',
                purpose: `Event Check-In: Parent of ${student?.name || 'Student'}`,
                visitDate: dateStr,
                timeIn: timeInStr,
                institutionId: currentInstitution.id,
                hostId: resolvedHostId,
                vehiclePlate: plate,
                idNumber: pin ? `PIN: ${pin.pin}` : ''
            });

            // Also add any accompanying guests
            if (pin && pin.guests) {
                try {
                    const parsedGuests = JSON.parse(pin.guests || '[]');
                    if (Array.isArray(parsedGuests)) {
                        for (const guestName of parsedGuests) {
                            if (guestName && typeof guestName === 'string' && guestName.trim()) {
                                await onAddVisitor({
                                    name: guestName.trim(),
                                    phoneNumber: parent.phoneNumber || '',
                                    purpose: `Accompanying Guest (Invited by ${parent.name})`,
                                    visitDate: dateStr,
                                    timeIn: timeInStr,
                                    institutionId: currentInstitution.id,
                                    hostId: resolvedHostId,
                                    vehiclePlate: plate,
                                    idNumber: `PIN: ${pin.pin}`
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse/add accompanying guests:", e);
                }
            }

            if (pin) {
                printEposGatePass(pin, parent, event, currentInstitution);
                const updatedPin = {
                    ...pin,
                    status: 'used'
                };
                await apiService.updateModuleRecord('event_pins', pin.id, updatedPin);
                await fetchHistoryAndEvents();
            }
            
            alert('Parent and guests verified and logged successfully for entry. Gatepass sent to printer.');
            
            setSelectedParent(null);
            setSelectedStudent(null);
            setSelectedPin(null);
            setAssociatedEvent(null);
            setParentSearchTerm('');
        } catch (err: any) {
            alert(err.message || 'Error logging parent entry');
        }
    };

    const handleVerifyParent = async () => {
        if (!selectedParent) return;
        await performVerificationAndPrint(selectedPin, selectedParent, associatedEvent, selectedStudent);
    };

    const recentLogs = (vehicleLogs || [])
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-2xl">
                    <QrCodeIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Security Gate Access</h2>
                    <p className="text-sm text-slate-500 font-medium">Verify Vehicles and Event Attendees</p>
                </div>
            </div>

            {/* Segmented Control */}
            <div className="flex mb-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full max-w-md">
                <button
                    onClick={() => setActiveTab('vehicle')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'vehicle' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <TruckIcon className="w-5 h-5" /> Vehicles
                </button>
                <button
                    onClick={() => setActiveTab('parent')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'parent' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <UserGroupIcon className="w-5 h-5" /> Parents & Events
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Scanner / Search Area */}
                <div className="space-y-6">
                    {activeTab === 'vehicle' ? (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                            <div className="relative mb-6">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value);
                                        if (e.target.value.length > 2) setSelectedVehicle(null);
                                    }}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                                    placeholder="Enter Plate Number..."
                                />
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {searchTerm.length > 1 && filteredVehicles.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => { setSelectedVehicle(v); setSearchTerm(v.plateNumber); }}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedVehicle?.id === v.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-slate-50 dark:bg-slate-900 active:scale-[0.98]'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <TruckIcon className={`w-8 h-8 ${v.vehicleType === 'school' ? 'text-blue-500' : 'text-purple-500'}`} />
                                            <div className="text-left">
                                                <p className="font-black text-xl text-slate-800 dark:text-white leading-none">{v.plateNumber}</p>
                                                <p className="text-xs text-slate-500 uppercase font-bold mt-1">{v.model}</p>
                                            </div>
                                        </div>
                                        <CheckCircleIcon className={`w-6 h-6 ${selectedVehicle?.id === v.id ? 'text-blue-500 opacity-100' : 'opacity-0'}`} />
                                    </button>
                                ))}
                                {searchTerm.length > 1 && filteredVehicles.length === 0 && (
                                    <div className="text-center py-8">
                                        <TruckIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 font-bold uppercase text-xs">Vehicle Not Found</p>
                                    </div>
                                )}
                                {searchTerm.length <= 1 && (
                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                        <QrCodeIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-sm text-slate-500 px-8">Point camera at the vehicle QR code or type the plate number above.</p>
                                        <button
                                            onClick={() => setScanning(true)}
                                            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                                        >
                                            Activate Scanner
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                             <div className="relative mb-4">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={parentSearchTerm}
                                    onChange={e => {
                                        setParentSearchTerm(e.target.value);
                                        if (e.target.value.length < 3) {
                                            setSelectedParent(null);
                                            setSelectedStudent(null);
                                        }
                                    }}
                                    onKeyUp={e => {
                                        if (e.key === 'Enter') handleSearchParent();
                                    }}
                                    className="w-full pl-12 pr-36 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-purple-500 outline-none text-lg font-bold"
                                    placeholder="Adm No, Phone, or Name..."
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setParentScanning(true)}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                                        title="Scan QR Pass"
                                    >
                                        <QrCodeIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </button>
                                    <button 
                                        onClick={() => handleSearchParent()}
                                        className="px-4 py-2 bg-purple-100 text-purple-600 rounded-xl font-black text-xs uppercase"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mb-6 px-2">Enter student admission number or parent's phone number to verify event access.</p>
                            
                            {parentSearchTerm.length === 0 && !selectedParent && (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <QrCodeIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-sm text-slate-500 px-8 font-medium">Scan visitor/parent QR code or enter details above.</p>
                                    <button
                                        onClick={() => setParentScanning(true)}
                                        className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg shadow-purple-200 dark:shadow-none"
                                    >
                                        Scan QR Pass
                                    </button>
                                </div>
                            )}
                            
                            {selectedParent && (
                                <div className="p-5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-purple-200 dark:bg-purple-800 rounded-xl flex items-center justify-center text-purple-700 dark:text-purple-300 font-black text-lg">
                                                {selectedParent.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-lg text-slate-800 dark:text-white leading-tight">{selectedParent.name}</h4>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedParent.phoneNumber || 'No Phone Number'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${
                                            selectedPin && selectedPin.status === 'used'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                        }`}>
                                            {selectedPin && selectedPin.status === 'used' ? (
                                                <>
                                                    <XCircleIcon className="w-3 h-3" /> ALREADY USED
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircleIcon className="w-3 h-3" /> MATCH
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    
                                    {selectedStudent && (
                                        <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800/50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Associated Student</p>
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                                <UserIcon className="w-4 h-4 text-slate-400" />
                                                <span>{selectedStudent.name}</span>
                                                {(selectedStudent.admissionNumber || selectedStudent.admission_number) && (
                                                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-md ml-auto">
                                                        {selectedStudent.admissionNumber || selectedStudent.admission_number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPin && (
                                        <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800/50 space-y-3">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Invitation</p>
                                                <p className="text-sm font-bold text-slate-850 dark:text-white mt-1">{associatedEvent?.title || 'Institution Event'}</p>
                                            </div>
                                            
                                            {(selectedPin.vehicleRegistration || selectedPin.vehicle_registration) && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Registration</p>
                                                    <span className="inline-block px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-lg text-xs font-bold mt-1">
                                                        {selectedPin.vehicleRegistration || selectedPin.vehicle_registration}
                                                    </span>
                                                </div>
                                            )}

                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accompanying Guests</p>
                                                <div className="mt-1 space-y-1">
                                                    {(() => {
                                                        try {
                                                            const parsed = JSON.parse(selectedPin.guests || '[]');
                                                            if (Array.isArray(parsed) && parsed.length > 0) {
                                                                return parsed.map((g: string, idx: number) => (
                                                                    <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                                        • {g}
                                                                    </div>
                                                                ));
                                                            }
                                                        } catch (e) {}
                                                        return <span className="text-xs text-slate-400 italic">No accompanying guests</span>;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {parentSearchTerm.length >= 3 && !selectedParent && (
                                <div className="text-center py-8">
                                    <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500 font-bold uppercase text-xs">No Parent/Student Found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Area */}
                    {activeTab === 'vehicle' ? (
                        selectedVehicle && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white mb-4">Log Gate Event</h3>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Internal Notes / Observations</label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-blue-500 outline-none"
                                        rows={2}
                                        placeholder="e.g. Broken tail light, 20 students onboard..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleVehicleAction('entry')}
                                        className="flex flex-col items-center justify-center p-6 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all shadow-lg shadow-green-100 dark:shadow-none"
                                    >
                                        <ArrowRightOnRectangleIcon className="w-8 h-8 rotate-180 mb-2" />
                                        <span className="font-black uppercase text-sm">Gate Entry</span>
                                    </button>
                                    <button
                                        onClick={() => handleVehicleAction('exit')}
                                        className="flex flex-col items-center justify-center p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-100 dark:shadow-none"
                                    >
                                        <ArrowRightOnRectangleIcon className="w-8 h-8 mb-2" />
                                        <span className="font-black uppercase text-sm">Gate Exit</span>
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        selectedParent && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white mb-4">Confirm Entry</h3>
                                <button
                                    onClick={handleVerifyParent}
                                    className="w-full flex items-center justify-center gap-3 p-5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition-all shadow-lg shadow-purple-200 dark:shadow-none"
                                >
                                    <CheckCircleIcon className="w-6 h-6" />
                                    <span className="font-black uppercase text-base tracking-wide">
                                        {selectedPin 
                                            ? (selectedPin.status === 'used' ? 'PIN Already Used - Grant Entry & Print' : 'Verify & Print EPOS Gatepass') 
                                            : 'Verify & Grant Entry'}
                                    </span>
                                </button>
                                {!onAddVisitor && (
                                    <p className="text-red-500 text-xs font-bold mt-3 text-center uppercase">System Error: Visitor logging not connected.</p>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* Recent History */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 h-fit">
                    {activeTab === 'vehicle' ? (
                        <>
                            <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white mb-6">Security Log (Recent Vehicles)</h3>
                            <div className="space-y-4">
                                {recentLogs.map(log => {
                                    const vehicle = vehicles.find(v => v.id === log.vehicleId);
                                    const security = activeUsers.find(u => u.id === log.securityId);
                                    return (
                                        <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <div className={`p-3 rounded-full h-fit ${log.eventType === 'entry' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <ArrowRightOnRectangleIcon className={`w-5 h-5 ${log.eventType === 'entry' ? 'rotate-180' : ''}`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-black text-slate-800 dark:text-white">{vehicle?.plateNumber || 'Unknown'}</p>
                                                    <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                                        <ClockIcon className="w-3 h-3" />
                                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">{log.eventType === 'entry' ? 'Incoming' : 'Outgoing'} • {security?.name || 'Security'}</p>
                                                {log.notes && <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 italic">"{log.notes}"</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {recentLogs.length === 0 && (
                                    <div className="text-center py-12">
                                        <ClockIcon className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                                        <p className="text-slate-400 text-xs font-bold uppercase">No records today</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">Recent Event Check-Ins</h3>
                                <button 
                                    onClick={fetchHistoryAndEvents} 
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all"
                                    title="Refresh Check-ins"
                                >
                                    <ArrowPathIcon className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                {(() => {
                                    const checkedInPins = allEventPins
                                        .filter(p => p.status === 'used')
                                        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
                                        .slice(0, 10);

                                    if (checkedInPins.length === 0) {
                                        return (
                                            <div className="text-center py-12">
                                                <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                                <p className="text-slate-400 text-xs font-bold uppercase">No check-ins logged yet</p>
                                            </div>
                                        );
                                    }

                                    return checkedInPins.map(pin => {
                                        const parent = activeUsers.find(u => u.id === pin.userId);
                                        const parentName = parent?.name || 'Invited Guest';
                                        const event = allEvents.find(e => e.id === pin.eventId);
                                        const student = activeUsers.find(u => 
                                            u.role === 'student' && (
                                                u.parentIds?.includes(pin.userId) || 
                                                parent?.studentIds?.includes(u.id) || 
                                                (u as any).parentPhone === (parent?.phoneNumber || '')
                                            )
                                        );

                                        return (
                                            <div key={pin.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white uppercase text-xs">{parentName}</p>
                                                        <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mt-0.5">PIN: {pin.pin}</p>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Checked In</span>
                                                </div>
                                                <div className="text-[10px] text-slate-550 dark:text-slate-450 space-y-0.5 leading-relaxed">
                                                    <p><span className="font-bold">Event:</span> {event?.title || 'Institution Event'}</p>
                                                    {student && <p><span className="font-bold">Student:</span> {student.name}</p>}
                                                </div>
                                                <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedPin(pin);
                                                            setSelectedParent(parent || {
                                                                id: pin.userId,
                                                                name: parentName,
                                                                phoneNumber: '',
                                                                role: 'parent',
                                                                institutionId: currentInstitution.id
                                                            } as any);
                                                            setAssociatedEvent(event || null);
                                                            setSelectedStudent(student || null);
                                                        }}
                                                        className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-350 dark:bg-slate-700 dark:hover:bg-slate-655 text-slate-800 dark:text-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        View Pass
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            printEposGatePass(pin, parent || { name: parentName }, event || { title: 'Institution Event' }, currentInstitution);
                                                        }}
                                                        className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md shadow-purple-500/10"
                                                    >
                                                        <PrinterIcon className="w-2.5 h-2.5 text-white" /> Reprint
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {scanning && activeTab === 'vehicle' && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-lg text-center">
                        <div className="relative aspect-square bg-slate-800 rounded-3xl border-4 border-blue-500 overflow-hidden mb-8 shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                            {/* In a real app we'd attach a scanner here. Simulation for agent task. */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
                                <QrCodeIcon className="w-32 h-32 text-blue-400/20 mb-4 animate-pulse" />
                                <p className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-8">Accessing Camera...</p>
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <button
                                        onClick={() => {
                                            if (vehicles.length > 0) {
                                                const v = vehicles[0];
                                                setSelectedVehicle(v);
                                                setSearchTerm(v.plateNumber);
                                                setScanning(false);
                                            }
                                        }}
                                        className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-2xl border border-white/20"
                                    >
                                        <p className="text-[10px] font-bold uppercase mb-1">Mock Scanner</p>
                                        <p className="text-xs font-black">Scan Detected</p>
                                    </button>
                                    <button
                                        onClick={() => setScanning(false)}
                                        className="bg-red-500/20 hover:bg-red-500/40 text-red-500 p-4 rounded-2xl border border-red-500/20"
                                    >
                                        <p className="text-[10px] font-bold uppercase mb-1">Abort</p>
                                        <p className="text-xs font-black">Exit</p>
                                    </button>
                                </div>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_#3b82f6] animate-[scan_3s_infinite]"></div>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Align QR Code</h3>
                        <p className="text-slate-400 font-medium">Position the vehicle's gate pass within the frame</p>
                    </div>
                    <style>{`
                        @keyframes scan {
                            0% { transform: translateY(0); }
                            50% { transform: translateY(400px); }
                            100% { transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}

            {parentScanning && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-lg text-center flex flex-col items-center">
                        <div className="relative aspect-square w-full max-w-[320px] bg-slate-800 rounded-3xl border-4 border-purple-500 overflow-hidden mb-6 shadow-[0_0_50px_rgba(168,85,247,0.5)]">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                                <QrCodeIcon className="w-24 h-24 text-purple-400/20 mb-4 animate-pulse" />
                                <p className="text-purple-400 font-bold uppercase text-[10px] tracking-widest mb-4">Accessing Camera...</p>
                                <button
                                    onClick={() => setParentScanning(false)}
                                    className="px-6 py-2.5 bg-red-650/40 hover:bg-red-650/60 text-red-300 rounded-xl border border-red-500/20 text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Cancel Scan
                                </button>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_20px_#a855f7] animate-[scan_3s_infinite]"></div>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Align Visitor QR Code</h3>
                        <p className="text-slate-400 font-medium text-xs mb-8">Position the guest's digital/printed pass within the frame</p>
                        
                        {/* Mock Scan Targets Interface */}
                        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Mock Scan Targets (Active Passes)</h4>
                                {loadingPins && <span className="text-[10px] font-black text-purple-400 animate-pulse uppercase">Syncing...</span>}
                            </div>
                            
                            <input 
                                type="text"
                                value={scanFilter}
                                onChange={e => setScanFilter(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-purple-500 outline-none text-xs text-white"
                                placeholder="Search by name, PIN..."
                            />

                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                {(() => {
                                    const filteredScannablePins = scannablePins.filter(p => {
                                        const parent = activeUsers.find(u => u.id === p.userId);
                                        const parentName = parent?.name || 'Invited Guest';
                                        const searchStr = `${parentName} ${p.pin} ${p.guests || ''}`.toLowerCase();
                                        return searchStr.includes(scanFilter.toLowerCase());
                                    });

                                    return filteredScannablePins.map((p: any) => {
                                        const parent = activeUsers.find(u => u.id === p.userId);
                                        const parentName = parent?.name || 'Invited Guest';
                                        const parentPhone = parent?.phoneNumber || '';
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setParentSearchTerm(p.pin);
                                                    handleSearchParent(p.pin);
                                                    setParentScanning(false);
                                                    setScanFilter('');
                                                }}
                                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-purple-950/20 border border-slate-800/80 hover:border-purple-500/30 transition-all text-left group"
                                            >
                                                <div>
                                                    <p className="text-xs font-black text-white group-hover:text-purple-400 transition-colors">{parentName}</p>
                                                    {parentPhone && <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{parentPhone}</p>}
                                                    {p.guests && (
                                                        <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">
                                                            +{(() => {
                                                                try { return JSON.parse(p.guests).length; } catch { return 1; }
                                                            })()} Guests
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-black font-mono bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-md border border-purple-500/20">
                                                        PIN: {p.pin}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    });
                                })()}
                                {scannablePins.filter(p => {
                                    const parent = activeUsers.find(u => u.id === p.userId);
                                    const parentName = parent?.name || 'Invited Guest';
                                    const searchStr = `${parentName} ${p.pin} ${p.guests || ''}`.toLowerCase();
                                    return searchStr.includes(scanFilter.toLowerCase());
                                }).length === 0 && (
                                    <div className="text-center py-6 text-slate-600 text-xs font-bold uppercase">
                                        No pending passes
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
