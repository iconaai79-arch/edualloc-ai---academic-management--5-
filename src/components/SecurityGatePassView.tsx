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
import { CameraIcon } from './icons/CameraIcon';

import type { TransportVehicle, VehicleLog, User, Institution, Visitor, Course, TeacherCheckIn } from '../types';
import { apiService } from '../services/apiService';
import { phonesMatch, phoneContains } from '../utils/stringUtils';
import { printService, getPrinterConfig, savePrinterConfig, getBluetoothPrinters, PrinterConfig } from '../services/printService';
import { Capacitor } from '@capacitor/core';

export const printEposGatePass = (pin: any, parent: any, event: any, institution: any) => {
    printService.printEventPass({ pin, parent, event, institution }).catch(err => {
        console.error("Event gatepass printing failed:", err);
        alert("Print failed: " + (err.message || err));
    });
};

export const printEposWalkInGatePass = (
    visitor: any,
    host: any,
    institution: any,
    hostSignature?: string,
    visitorSignature?: string,
    securityOfficerName?: string
) => {
    printService.printVisitorPass({ 
        visitorData: visitor, 
        institution,
        host,
        hostSignature,
        visitorSignature,
        securityOfficerName
    }).catch(err => {
        console.error("Visitor gatepass printing failed:", err);
        alert("Print failed: " + (err.message || err));
    });
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
    onCheckoutVisitor?: (id: string) => void | Promise<void>;
    courses?: Course[];
    eventPins?: any[];
    events?: any[];
    teacherCheckIns?: TeacherCheckIn[];
    onTeacherGateCheckIn?: (teacherId: string, type: 'Morning' | 'Afternoon', location: string, notes?: string) => Promise<void>;
    initialTab?: 'vehicle' | 'parent' | 'staff';
}

export const SecurityGatePassView: React.FC<SecurityGatePassViewProps> = ({
    vehicles, vehicleLogs, users, visitors = [], currentUser, currentInstitution, onLogGateAction, onAddVisitor, 
    onCheckoutVisitor, courses = [], eventPins, events, teacherCheckIns = [], onTeacherGateCheckIn, initialTab
}) => {
    const [activeTab, setActiveTab] = useState<'vehicle' | 'parent' | 'staff' | 'settings'>(initialTab || 'vehicle');
    const [activeUsers, setActiveUsers] = useState<User[]>(users);
    
    const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(getPrinterConfig());
    const [pairedPrinters, setPairedPrinters] = useState<{ name: string; address: string }[]>([]);
    const [isBluetoothLoading, setIsBluetoothLoading] = useState(false);

    const handleLoadBluetoothPrinters = async () => {
        setIsBluetoothLoading(true);
        try {
            const devices = await getBluetoothPrinters();
            setPairedPrinters(devices);
        } catch (e: any) {
            console.error("Bluetooth printers search failed:", e);
        } finally {
            setIsBluetoothLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'settings') {
            handleLoadBluetoothPrinters();
        }
    }, [activeTab]);
    const [dahuaConfig, setDahuaConfig] = useState<{
        ipAddress: string;
        port: number;
        username?: string;
        password?: string;
        enabled: boolean;
    }>(() => {
        const data = localStorage.getItem('eduai_dahua_config');
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error("Failed to parse Dahua config:", e);
            }
        }
        return { ipAddress: '', port: 80, username: 'admin', password: '', enabled: false };
    });

    const [testingDahua, setTestingDahua] = useState(false);

    const testDahuaConnection = async () => {
        if (!dahuaConfig.ipAddress) {
            alert("Please configure a valid Terminal IP Address first.");
            return;
        }
        
        setTestingDahua(true);
        const authPrefix = dahuaConfig.username && dahuaConfig.password 
            ? `${dahuaConfig.username}:${dahuaConfig.password}@` 
            : '';
        const baseUrl = `http://${authPrefix}${dahuaConfig.ipAddress}:${dahuaConfig.port || 80}`;
        const testUrl = `${baseUrl}/cgi-bin/magicBox.cgi?action=getSystemInfo`;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout
            
            await fetch(testUrl, {
                method: 'GET',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            alert("Connection test initiated! The device responded and is reachable on the network.");
        } catch (err: any) {
            console.error("Dahua connection test failed:", err);
            if (err.name === 'AbortError') {
                alert("Connection test timed out. Please check if the device is powered on, connected to the same network, and the IP/port are correct.");
            } else {
                alert(`Connection test failed: ${err.message || 'Device unreachable or network error.'}`);
            }
        } finally {
            setTestingDahua(false);
        }
    };

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

    // Staff State
    const [staffSearchTerm, setStaffSearchTerm] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
    const [staffNotes, setStaffNotes] = useState('');
    const [staffCheckInType, setStaffCheckInType] = useState<'Morning' | 'Afternoon'>('Morning');
    const [staffScanning, setStaffScanning] = useState(false);

    const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

    const filteredStaff = React.useMemo(() => {
        const query = staffSearchTerm.toLowerCase();
        return (users || []).filter(u => 
            u && u.role && 
            !['student', 'parent', 'customer', 'super_admin', 'visitor'].includes(u.role) &&
            (u.name.toLowerCase().includes(query) || (u.phoneNumber || '').toLowerCase().includes(query) || u.role.toLowerCase().includes(query))
        );
    }, [users, staffSearchTerm]);

    const registerUserOnDahua = async (user: User) => {
        if (!dahuaConfig.enabled || !dahuaConfig.ipAddress) {
            return;
        }
        
        const resolveCardNo = (u: User) => {
            const digits = (u.phoneNumber || '').replace(/\D/g, '') || (u.staffId || '').replace(/\D/g, '');
            if (digits && digits.length >= 4) {
                return digits.substring(0, 10);
            }
            let hash = 0;
            for (let i = 0; i < u.id.length; i++) {
                hash = u.id.charCodeAt(i) + ((hash << 5) - hash);
            }
            return String(Math.abs(hash)).substring(0, 10);
        };

        const cardNo = resolveCardNo(user);
        const userId = user.staffId || user.id.substring(0, 8);
        
        const authPrefix = dahuaConfig.username && dahuaConfig.password 
            ? `${dahuaConfig.username}:${dahuaConfig.password}@` 
            : '';
        
        const baseUrl = `http://${authPrefix}${dahuaConfig.ipAddress}:${dahuaConfig.port || 80}`;
        const cardUrl = `${baseUrl}/cgi-bin/recordUpdater.cgi?action=insert&name=AccessControlCard&CardNo=${cardNo}&UserID=${userId}&CardStatus=0&CardType=0`;
        
        console.log(`Dahua Integration: Syncing card record for ${user.name} (ID: ${userId}, Card: ${cardNo})`);
        
        try {
            await fetch(cardUrl, { 
                method: 'GET',
                mode: 'no-cors'
            });
            console.log("Dahua Integration: User card sync dispatched successfully.");
        } catch (err: any) {
            console.error("Dahua Integration: Error dispatching user record to device:", err);
        }
    };

    // Walk-in registration state
    const [showWalkInForm, setShowWalkInForm] = useState(false);
    const [walkInCategory, setWalkInCategory] = useState<string>('parent');
    const [walkInName, setWalkInName] = useState('');
    const [walkInPhone, setWalkInPhone] = useState('');
    const [walkInIdNumber, setWalkInIdNumber] = useState('');
    const [walkInPurpose, setWalkInPurpose] = useState('');
    const [walkInCompany, setWalkInCompany] = useState('');
    const [walkInHostName, setWalkInHostName] = useState('');
    const [walkInGenerating, setWalkInGenerating] = useState(false);

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
        if (eventPins) {
            setAllEventPins(eventPins);
        }
    }, [eventPins]);

    useEffect(() => {
        if (events) {
            setAllEvents(events);
        }
    }, [events]);

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
                        phonesMatch((u as any).parentPhone || '', parentMatch?.phoneNumber || '')
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
                 parentMatch = searchUsers.find(u => u.role === 'parent' && phonesMatch(u.phoneNumber || '', (studentMatch as any).parentPhone || ''));
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
            (phoneContains(u.phoneNumber || '', term) || u.name.toLowerCase().includes(term))
        );

        if (parentDirectMatch) {
            setSelectedParent(parentDirectMatch);
            // Find associated student
            const childMatch = searchUsers.find(u => 
                u.role === 'student' && (
                    u.parentIds?.includes(parentDirectMatch.id) || 
                    parentDirectMatch.studentIds?.includes(u.id) || 
                    phonesMatch((u as any).parentPhone || '', parentDirectMatch.phoneNumber || '')
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

        // 3. Search by Parent Info stored directly on Student registry
        const studentRegistryParentMatch = searchUsers.find(u => 
            u.role === 'student' && (
                ((u as any).parentPhone && phoneContains((u as any).parentPhone, term)) ||
                ((u as any).parent_phone && phoneContains((u as any).parent_phone, term)) ||
                ((u as any).parentName?.toLowerCase().includes(term)) ||
                ((u as any).parent_name?.toLowerCase().includes(term))
            )
        );

        if (studentRegistryParentMatch) {
            setSelectedStudent(studentRegistryParentMatch);
            // Construct a mock parent
            const parentPhone = (studentRegistryParentMatch as any).parentPhone || (studentRegistryParentMatch as any).parent_phone || '';
            const parentName = (studentRegistryParentMatch as any).parentName || (studentRegistryParentMatch as any).parent_name || 'Unknown Parent';
            const mockParent = {
                id: 'temp_' + studentRegistryParentMatch.id,
                name: parentName,
                phoneNumber: parentPhone,
                role: 'parent',
                email: (studentRegistryParentMatch as any).parentEmail || (studentRegistryParentMatch as any).parent_email || '',
                institutionId: currentInstitution.id
            } as any;
            setSelectedParent(mockParent);

            // Look up associated active/used PIN if any
            try {
                const pinRecords = await apiService.fetchModuleRecords('event_pins', currentInstitution.id);
                const activePins = pinRecords.filter(p => 
                    (p.userId === studentRegistryParentMatch.id || p.userId === mockParent.id)
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
                console.error("Failed to query PIN for student registry parent match:", e);
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

    // Auto-generate a PIN for a parent against the nearest upcoming event
    const autoGeneratePinForParent = async (parentUser: any): Promise<any | null> => {
        try {
            // Save mock parent user in the DB first if needed
            let realUserId = parentUser.id;
            if (parentUser.id.startsWith('temp_')) {
                const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newParentRecord = {
                    id: newUserId,
                    name: parentUser.name,
                    phoneNumber: parentUser.phoneNumber || null,
                    role: 'parent',
                    institutionId: currentInstitution.id,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('users', newParentRecord);
                realUserId = newUserId;

                // Update the student record to link this parent user
                if (selectedStudent) {
                    const studentParentIds = [...(selectedStudent.parentIds || (selectedStudent as any).parent_ids || [])];
                    if (!studentParentIds.includes(newUserId)) {
                        studentParentIds.push(newUserId);
                    }
                    const updatedStudent = {
                        ...selectedStudent,
                        parentIds: studentParentIds
                    };
                    await apiService.updateModuleRecord('users', selectedStudent.id, updatedStudent);
                    setSelectedStudent(updatedStudent);
                }

                // Update selectedParent reference in local state
                parentUser.id = newUserId;
                setSelectedParent(prev => prev ? { ...prev, id: newUserId } : null);
            }

            const events = await apiService.fetchModuleRecords('institution_events', currentInstitution.id);
            if (!events || events.length === 0) return null;
            const now = new Date().toISOString().split('T')[0];
            const sorted = [...events].sort((a: any, b: any) => {
                const aDate = a.eventDate || a.event_date || '';
                const bDate = b.eventDate || b.event_date || '';
                const aFuture = aDate >= now;
                const bFuture = bDate >= now;
                if (aFuture && !bFuture) return -1;
                if (!aFuture && bFuture) return 1;
                return aDate > bDate ? 1 : -1;
            });
            const targetEvent = sorted[0];
            const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
            const newPinId = `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const newPin = {
                id: newPinId,
                institutionId: currentInstitution.id,
                eventId: targetEvent.id,
                userId: realUserId,
                pin: pinCode,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('event_pins', newPin);
            return { pin: newPin, event: targetEvent };
        } catch (err) {
            console.error('Auto-generate PIN failed:', err);
            return null;
        }
    };

    const handleVerifyParent = async () => {
        if (!selectedParent) return;

        let pinToUse = selectedPin;
        let eventToUse = associatedEvent;

        // Auto-generate a PIN if none exists
        if (!pinToUse) {
            const result = await autoGeneratePinForParent(selectedParent);
            if (result) {
                pinToUse = result.pin;
                eventToUse = result.event;
                setSelectedPin(pinToUse);
                setAssociatedEvent(eventToUse);
            }
        }

        await performVerificationAndPrint(pinToUse, selectedParent, eventToUse, selectedStudent);
    };

    // Handle walk-in registration (creates user + PIN from scratch)
    const handleWalkInRegister = async () => {
        const name = walkInName.trim();
        const phone = walkInPhone.trim();
        const idNo = walkInIdNumber.trim();
        const purp = walkInPurpose.trim();
        const comp = walkInCompany.trim();
        const host = walkInHostName.trim();

        if (!name) { alert('Please enter the visitor\'s name.'); return; }
        if (walkInCategory !== 'parent' && !idNo) { alert('ID / Passport Number is required for non-parent check-ins.'); return; }
        if (walkInCategory !== 'parent' && !purp) { alert('Purpose of entry is required.'); return; }

        setWalkInGenerating(true);
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const timeInStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (walkInCategory === 'parent') {
                // Original parent event PIN check-in workflow
                let parentUser: any = null;
                if (phone) {
                    const existing = await apiService.fetchModuleRecords('users', currentInstitution.id, undefined, {
                        filter: { role: 'parent' }
                    });
                    parentUser = existing.find((u: any) => phonesMatch(u.phoneNumber || u.phone_number || '', phone));
                }
                if (!parentUser) {
                    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    parentUser = {
                        id: newUserId,
                        name,
                        phoneNumber: phone || null,
                        role: 'parent',
                        institutionId: currentInstitution.id,
                        createdAt: new Date().toISOString()
                    };
                    await apiService.saveModuleRecord('users', parentUser);
                }

                const result = await autoGeneratePinForParent(parentUser);
                if (!result) {
                    alert('No upcoming events found to assign a pass. Please create an event first.');
                    setWalkInGenerating(false);
                    return;
                }

                setSelectedParent(parentUser);
                setSelectedPin(result.pin);
                setAssociatedEvent(result.event);
                setSelectedStudent(null);
                setShowWalkInForm(false);
                setWalkInName('');
                setWalkInPhone('');
                await performVerificationAndPrint(result.pin, parentUser, result.event, null);
            } else {
                // General visitor workflow (e.g. casual construction worker, delivery, contractor)
                const categoryLabels: Record<string, string> = {
                    contractor: 'Construction Contractor',
                    casual: 'Casual Worker',
                    delivery: 'Supplier/Delivery',
                    guest: 'Official Guest',
                    other: 'General Walk-in'
                };
                const label = categoryLabels[walkInCategory] || 'Visitor';
                const formattedPurpose = `[${label}] ${purp}${comp ? ` (Company: ${comp})` : ''}`;
                
                const newVisitor: Omit<Visitor, 'id'> = {
                    name,
                    phoneNumber: phone,
                    purpose: formattedPurpose,
                    visitDate: dateStr,
                    timeIn: timeInStr,
                    institutionId: currentInstitution.id,
                    hostId: currentUser.id,
                    hostName: host || 'Security Gate',
                    idNumber: idNo,
                    status: 'checked_in'
                };

                if (onAddVisitor) {
                    await onAddVisitor(newVisitor);
                } else {
                    const record = {
                        ...newVisitor,
                        id: `vis_${Date.now()}`
                    };
                    await apiService.saveModuleRecord('visitors', record);
                }

                // Print the walk-in gatepass directly
                printEposWalkInGatePass(
                    newVisitor,
                    { name: host || 'Security Gate', role: 'Staff' } as any,
                    currentInstitution
                );

                alert(`${label} entry logged successfully! Gatepass sent to printer.`);
                
                setShowWalkInForm(false);
                setWalkInName('');
                setWalkInPhone('');
                setWalkInIdNumber('');
                setWalkInPurpose('');
                setWalkInCompany('');
                setWalkInHostName('');
            }
        } catch (err: any) {
            alert(err.message || 'Failed to register walk-in visitor.');
        } finally {
            setWalkInGenerating(false);
        }
    };

    const recentLogs = (vehicleLogs || [])
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/50 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/70 p-4 md:p-8 select-none relative overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 dark:bg-blue-500/2 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 dark:bg-purple-500/2 blur-[100px] pointer-events-none"></div>

            <div className="max-w-6xl mx-auto z-10 relative space-y-8">
                {/* Header Desk Card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-[2.5rem] shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2.5xl text-white shadow-lg shadow-blue-500/20">
                            <QrCodeIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Security Gate Access</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span> Active Gate Desk
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => {
                                setPrinterConfig(getPrinterConfig());
                                setActiveTab('settings');
                                handleLoadBluetoothPrinters();
                            }}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl border border-slate-200/40 dark:border-slate-850 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                            title="Configure Thermal Printer"
                        >
                            <PrinterIcon className="w-4 h-4 text-indigo-500" />
                            <span>Printer Config</span>
                        </button>
                        
                        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/40 dark:border-slate-850 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-blue-500" />
                            {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Segmented Control Tabs */}
                <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-850 p-2 rounded-[2rem] shadow-md flex flex-wrap gap-2 w-full max-w-3xl">
                    <button
                        onClick={() => setActiveTab('vehicle')}
                        className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 border ${
                            activeTab === 'vehicle'
                                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-600/10'
                                : 'bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 border-transparent'
                        }`}
                    >
                        <TruckIcon className="w-4.5 h-4.5" /> Vehicles
                    </button>
                    <button
                        onClick={() => setActiveTab('parent')}
                        className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 border ${
                            activeTab === 'parent'
                                ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white border-transparent shadow-lg shadow-purple-600/10'
                                : 'bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 border-transparent'
                        }`}
                    >
                        <UserGroupIcon className="w-4.5 h-4.5" /> Parents & Guests
                    </button>
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 border ${
                            activeTab === 'staff'
                                ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-transparent shadow-lg shadow-indigo-600/10'
                                : 'bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 border-transparent'
                        }`}
                    >
                        <UserIcon className="w-4.5 h-4.5" /> Staff Gate
                    </button>
                    <button
                        onClick={() => {
                            setPrinterConfig(getPrinterConfig());
                            setActiveTab('settings');
                        }}
                        className={`flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 border ${
                            activeTab === 'settings'
                                ? 'bg-gradient-to-tr from-slate-700 to-slate-900 text-white border-transparent shadow-lg shadow-slate-900/10'
                                : 'bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 border-transparent'
                        }`}
                    >
                        <PrinterIcon className="w-4.5 h-4.5 text-indigo-500" /> Settings
                    </button>
                </div>

                {/* Grid Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left side: Search and Actions */}
                    <div className="lg:col-span-7 space-y-6">
                        {activeTab === 'settings' ? (
                            <div className="space-y-6 animate-in fade-in">
                                {/* Thermal Printer Configuration */}
                                <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200/80 dark:border-slate-850 space-y-6">
                                    <div>
                                        <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white tracking-widest italic">Thermal Printer Configuration</h3>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-555 uppercase tracking-widest mt-1">Configure your local gate receipt spooler</p>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Connection Interface</label>
                                            <select 
                                                value={printerConfig.type}
                                                onChange={(e) => {
                                                    const updated = { ...printerConfig, type: e.target.value as any };
                                                    setPrinterConfig(updated);
                                                    savePrinterConfig(updated);
                                                }}
                                                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                            >
                                                <option value="system">System Spooler (PDF / Preview)</option>
                                                <option value="bluetooth">Bluetooth Printer (Raw ESC/POS)</option>
                                                <option value="network">Network IP Printer (Direct TCP Port 9100)</option>
                                            </select>
                                        </div>

                                        {printerConfig.type === 'network' && (
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Printer IP Address</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. 192.168.1.100" 
                                                        value={printerConfig.ipAddress || ''}
                                                        onChange={(e) => {
                                                            const updated = { ...printerConfig, ipAddress: e.target.value };
                                                            setPrinterConfig(updated);
                                                            savePrinterConfig(updated);
                                                        }}
                                                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Port</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="9100" 
                                                        value={printerConfig.port || 9100}
                                                        onChange={(e) => {
                                                            const updated = { ...printerConfig, port: parseInt(e.target.value) || 9100 };
                                                            setPrinterConfig(updated);
                                                            savePrinterConfig(updated);
                                                        }}
                                                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {printerConfig.type === 'bluetooth' && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Select Bluetooth Printer</label>
                                                    <button
                                                        type="button"
                                                        onClick={handleLoadBluetoothPrinters}
                                                        className="text-[10px] font-black text-indigo-600 dark:text-indigo-405 uppercase tracking-widest hover:underline cursor-pointer"
                                                        disabled={isBluetoothLoading}
                                                    >
                                                        {isBluetoothLoading ? 'Searching...' : 'Refresh Devices'}
                                                    </button>
                                                </div>
                                                {pairedPrinters.length > 0 ? (
                                                    <select
                                                        value={printerConfig.bluetoothAddress || ''}
                                                        onChange={(e) => {
                                                            const selected = pairedPrinters.find(p => p.address === e.target.value);
                                                            const updated = {
                                                                ...printerConfig,
                                                                bluetoothAddress: e.target.value,
                                                                bluetoothName: selected?.name
                                                            };
                                                            setPrinterConfig(updated);
                                                            savePrinterConfig(updated);
                                                        }}
                                                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                                    >
                                                        <option value="">-- Choose a Printer --</option>
                                                        {pairedPrinters.map(p => (
                                                            <option key={p.address} value={p.address}>
                                                                {p.name} ({p.address})
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] text-slate-400 italic">No paired Bluetooth devices loaded. Try refreshing.</p>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Or enter MAC address manually: 00:11:22:33:44:55" 
                                                            value={printerConfig.bluetoothAddress || ''}
                                                            onChange={(e) => {
                                                                const updated = { ...printerConfig, bluetoothAddress: e.target.value };
                                                                setPrinterConfig(updated);
                                                                savePrinterConfig(updated);
                                                            }}
                                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm font-bold uppercase tracking-wider focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Thermal Roll Paper Width</label>
                                            <select 
                                                value={printerConfig.paperWidth || 80}
                                                onChange={(e) => {
                                                    const updated = { ...printerConfig, paperWidth: parseInt(e.target.value) as any };
                                                    setPrinterConfig(updated);
                                                    savePrinterConfig(updated);
                                                }}
                                                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                            >
                                                <option value={80}>80 mm Thermal Spool</option>
                                                <option value={58}>58 mm Mini-Spool</option>
                                            </select>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                savePrinterConfig(printerConfig);
                                                alert("Printer settings committed successfully.");
                                            }}
                                            className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-750 hover:to-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/10 active:scale-95 transition-all"
                                        >
                                            Commit Printer Settings
                                        </button>
                                    </div>
                                </div>

                                {/* Dahua Access Control Integration */}
                                <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200/80 dark:border-slate-850 space-y-6">
                                    <div>
                                        <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white tracking-widest italic">Dahua Face Recognition Terminal</h3>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-555 uppercase tracking-widest mt-1">Enroll staff credentials automatically on gate check-in</p>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850">
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Enable Automated Sync</span>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const updated = { ...dahuaConfig, enabled: !dahuaConfig.enabled };
                                                    setDahuaConfig(updated);
                                                    localStorage.setItem('eduai_dahua_config', JSON.stringify(updated));
                                                }}
                                                className={`w-12 h-6 rounded-full transition-all relative outline-none ${dahuaConfig.enabled ? 'bg-indigo-650' : 'bg-slate-300 dark:bg-slate-800'}`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${dahuaConfig.enabled ? 'right-1' : 'left-1'}`}></span>
                                            </button>
                                        </div>

                                        {dahuaConfig.enabled && (
                                            <div className="space-y-6 animate-in slide-in-from-top-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-2 space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Terminal IP Address</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="e.g. 192.168.1.108" 
                                                            value={dahuaConfig.ipAddress}
                                                            onChange={(e) => {
                                                                const updated = { ...dahuaConfig, ipAddress: e.target.value };
                                                                setDahuaConfig(updated);
                                                                localStorage.setItem('eduai_dahua_config', JSON.stringify(updated));
                                                            }}
                                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">API Port</label>
                                                        <input 
                                                            type="number" 
                                                            placeholder="80" 
                                                            value={dahuaConfig.port}
                                                            onChange={(e) => {
                                                                const updated = { ...dahuaConfig, port: parseInt(e.target.value) || 80 };
                                                                setDahuaConfig(updated);
                                                                localStorage.setItem('eduai_dahua_config', JSON.stringify(updated));
                                                            }}
                                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">CGI Username</label>
                                                        <input 
                                                            type="text" 
                                                            value={dahuaConfig.username}
                                                            onChange={(e) => {
                                                                const updated = { ...dahuaConfig, username: e.target.value };
                                                                setDahuaConfig(updated);
                                                                localStorage.setItem('eduai_dahua_config', JSON.stringify(updated));
                                                            }}
                                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-550 outline-none transition-all dark:text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">CGI Password</label>
                                                        <input 
                                                            type="password" 
                                                            placeholder="••••••••" 
                                                            value={dahuaConfig.password}
                                                            onChange={(e) => {
                                                                const updated = { ...dahuaConfig, password: e.target.value };
                                                                setDahuaConfig(updated);
                                                                localStorage.setItem('eduai_dahua_config', JSON.stringify(updated));
                                                            }}
                                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-550 outline-none transition-all dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button 
                                                type="button"
                                                onClick={testDahuaConnection}
                                                disabled={testingDahua}
                                                className={`flex-1 py-4.5 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all border ${
                                                    testingDahua 
                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700' 
                                                        : 'bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                                                }`}
                                            >
                                                {testingDahua ? 'Testing...' : 'Test Connection'}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    localStorage.setItem('eduai_dahua_config', JSON.stringify(dahuaConfig));
                                                    alert("Dahua terminal configurations saved successfully.");
                                                }}
                                                className="flex-1 py-4.5 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                                            >
                                                Save Settings
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'vehicle' ? (
                            <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200/80 dark:border-slate-850">
                                <div className="relative mb-6">
                                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => {
                                            setSearchTerm(e.target.value);
                                            if (e.target.value.length > 2) setSelectedVehicle(null);
                                        }}
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:ring-2 focus:ring-blue-500 outline-none text-base font-bold h-14 transition-all"
                                        placeholder="Type Vehicle Plate Number..."
                                    />
                                </div>

                                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                                    {searchTerm.length > 1 && filteredVehicles.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => { setSelectedVehicle(v); setSearchTerm(v.plateNumber); }}
                                            className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                                                selectedVehicle?.id === v.id
                                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                                    : 'border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/40 active:scale-[0.98]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${v.vehicleType === 'school' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                    <TruckIcon className="w-8 h-8" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-xl text-slate-900 dark:text-white leading-none">{v.plateNumber}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider mt-1">{v.model}</p>
                                                </div>
                                            </div>
                                            <CheckCircleIcon className={`w-7 h-7 ${selectedVehicle?.id === v.id ? 'text-blue-500 opacity-100' : 'opacity-0'}`} />
                                        </button>
                                    ))}
                                    {searchTerm.length > 1 && filteredVehicles.length === 0 && (
                                        <div className="text-center py-12">
                                            <TruckIcon className="w-14 h-14 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                                            <p className="text-slate-500 dark:text-slate-450 font-black uppercase text-xs tracking-widest">Vehicle Not Registered</p>
                                        </div>
                                    )}
                                    {searchTerm.length <= 1 && (
                                        <div className="text-center py-12 bg-slate-50/40 dark:bg-slate-950/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <QrCodeIcon className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                            <p className="text-sm text-slate-500 dark:text-slate-400 px-8 font-medium">Position plate scanner or tap button below to activate phone camera</p>
                                            <button
                                                onClick={() => setScanning(true)}
                                                className="mt-6 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-750 hover:to-indigo-750 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-600/15"
                                            >
                                                Open Plate Scanner
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            ) : activeTab === 'parent' ? (
                            <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200/80 dark:border-slate-850">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 px-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <div>
                                        <h3 className="text-sm font-black uppercase text-slate-850 dark:text-slate-200 tracking-wider">Parents & Guests Registry</h3>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Verify invite PINs or register construction / casual workers</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowWalkInForm(v => !v);
                                            setSelectedParent(null);
                                            setSelectedStudent(null);
                                            setParentSearchTerm('');
                                        }}
                                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                    >
                                        {showWalkInForm ? '✕ Close Form' : '➕ Authorize Walk-In'}
                                    </button>
                                </div>

                                {!showWalkInForm ? (
                                    <>
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
                                                className="w-full pl-12 pr-40 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:ring-2 focus:ring-purple-500 outline-none text-base font-bold h-14 transition-all dark:text-white"
                                                placeholder="Adm No, Phone, or PIN..."
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => setParentScanning(true)}
                                                    className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 rounded-xl transition-all"
                                                    title="Scan QR Pass"
                                                >
                                                    <QrCodeIcon className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleSearchParent()}
                                                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase transition-all shadow-md shadow-purple-600/10"
                                                >
                                                    Search
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {parentSearchTerm.length === 0 && !selectedParent && (
                                            <div className="text-center py-12 bg-slate-50/40 dark:bg-slate-950/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                                <QrCodeIcon className="w-14 h-14 text-slate-350 dark:text-slate-750 mx-auto mb-4" />
                                                <p className="text-sm text-slate-500 dark:text-slate-400 px-8 font-medium">Scan visitor/parent invitation card or enter PIN to begin</p>
                                                <button
                                                    onClick={() => setParentScanning(true)}
                                                    className="mt-6 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-750 hover:to-pink-750 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-purple-600/15"
                                                >
                                                    Scan Invitee QR
                                                </button>
                                            </div>
                                        )}
                                        
                                        {selectedParent && (
                                            <div className="p-6 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/50 rounded-3xl animate-in fade-in slide-in-from-bottom-4 space-y-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">
                                                            {selectedParent.name.charAt(0)}
                                                        </div>
                                                        <div className="text-left">
                                                            <h4 className="font-black text-lg text-slate-900 dark:text-white leading-tight">{selectedParent.name}</h4>
                                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-1">{selectedParent.phoneNumber || 'No Phone Number'}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                                                        selectedPin && selectedPin.status === 'used'
                                                            ? 'bg-red-500/10 text-red-650 border-red-500/20'
                                                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                    }`}>
                                                        {selectedPin && selectedPin.status === 'used' ? (
                                                            <>
                                                                <XCircleIcon className="w-3.5 h-3.5 animate-pulse" /> DUPLICATE / USED
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircleIcon className="w-3.5 h-3.5" /> ACTIVE PASS
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                                
                                                {selectedStudent && (
                                                    <div className="pt-4 border-t border-purple-200/50 dark:border-purple-800/40">
                                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">Associated Student</p>
                                                        <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-950/40 rounded-xl border border-purple-200/30 dark:border-purple-850">
                                                            <UserIcon className="w-5 h-5 text-slate-400" />
                                                            <span className="text-xs font-black text-slate-750 dark:text-slate-300">{selectedStudent.name}</span>
                                                            {(selectedStudent.admissionNumber || selectedStudent.admission_number) && (
                                                                <span className="px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black rounded-lg ml-auto">
                                                                    {selectedStudent.admissionNumber || selectedStudent.admission_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedPin && (
                                                    <div className="pt-4 border-t border-purple-200/50 dark:border-purple-800/40 space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Event Invitation</p>
                                                                <p className="text-xs font-black text-slate-800 dark:text-white mt-1.5 leading-tight">{associatedEvent?.title || 'Institution Event'}</p>
                                                            </div>
                                                            
                                                            {(selectedPin.vehicleRegistration || selectedPin.vehicle_registration) && (
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vehicle Reg Plate</p>
                                                                    <span className="inline-block px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold mt-1.5 font-mono">
                                                                        {selectedPin.vehicleRegistration || selectedPin.vehicle_registration}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Accompanying Guests</p>
                                                            <div className="mt-2 space-y-1">
                                                                {(() => {
                                                                    try {
                                                                        const parsed = JSON.parse(selectedPin.guests || '[]');
                                                                        if (Array.isArray(parsed) && parsed.length > 0) {
                                                                            return parsed.map((g: string, idx: number) => (
                                                                                <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {g}
                                                                                </div>
                                                                            ));
                                                                        }
                                                                    } catch (e) {}
                                                                    return <span className="text-xs text-slate-450 dark:text-slate-500 italic">No accompanying guests</span>;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-4 border-t border-purple-200/50 dark:border-purple-800/40">
                                                    <button
                                                        onClick={handleVerifyParent}
                                                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-650 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                                                    >
                                                        Confirm Verification & print pass
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {parentSearchTerm.length >= 3 && !selectedParent && (
                                            <div className="text-center py-12">
                                                <UserGroupIcon className="w-14 h-14 text-slate-350 dark:text-slate-750 mx-auto mb-3" />
                                                <p className="text-slate-500 dark:text-slate-450 font-black uppercase text-xs tracking-wider">Visitor Record Not Found</p>
                                                <p className="text-slate-400 text-[11px] font-medium mt-1 mb-5">Create a quick gate pass record for this walk-in visitor.</p>
                                                <button
                                                    onClick={() => setShowWalkInForm(true)}
                                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-755 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer"
                                                >
                                                    + Register Walk-In Visitor
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-6 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/50 rounded-3xl space-y-4 animate-in fade-in slide-in-from-bottom-4 text-left">
                                        <h4 className="font-black text-sm uppercase text-purple-700 dark:text-purple-300 tracking-wider">Walk-In Registration</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1.5 ml-1">Visitor Category *</label>
                                                <select
                                                    value={walkInCategory}
                                                    onChange={e => setWalkInCategory(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-purple-200/50 dark:border-purple-800/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                                >
                                                    <option value="parent">Parent / Guardian</option>
                                                    <option value="contractor">Construction Contractor</option>
                                                    <option value="casual">Casual Worker / Labourer</option>
                                                    <option value="delivery">Supplier / Delivery Agent</option>
                                                    <option value="guest">Official Guest / Inspector</option>
                                                    <option value="other">Other / Walk-in Visitor</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1.5 ml-1">Full Name *</label>
                                                    <input
                                                        type="text"
                                                        value={walkInName}
                                                        onChange={e => setWalkInName(e.target.value)}
                                                        placeholder="Guest's first & last name"
                                                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-purple-200/50 dark:border-purple-800/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1.5 ml-1">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        value={walkInPhone}
                                                        onChange={e => setWalkInPhone(e.target.value)}
                                                        placeholder="e.g. 0712 345 678"
                                                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-purple-200/50 dark:border-purple-800/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                                    />
                                                </div>
                                            </div>

                                            {walkInCategory !== 'parent' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1.5 ml-1">National ID / Passport No *</label>
                                                        <input
                                                            type="text"
                                                            value={walkInIdNumber}
                                                            onChange={e => setWalkInIdNumber(e.target.value)}
                                                            placeholder="Enter ID number"
                                                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-purple-200/50 dark:border-purple-800/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1.5 ml-1">Company / Contractor Name</label>
                                                        <input
                                                            type="text"
                                                            value={walkInCompany}
                                                            onChange={e => setWalkInCompany(e.target.value)}
                                                            placeholder="e.g. Apex Construction Ltd"
                                                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-purple-200/50 dark:border-purple-800/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {walkInCategory !== 'parent' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1.5 ml-1">Purpose of Entry *</label>
                                                        <input
                                                            type="text"
                                                            value={walkInPurpose}
                                                            onChange={e => setWalkInPurpose(e.target.value)}
                                                            placeholder="e.g. Building expansion repairs"
                                                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-purple-200/50 dark:border-purple-800/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1.5 ml-1">Host / Attending Supervisor</label>
                                                        <input
                                                            type="text"
                                                            value={walkInHostName}
                                                            onChange={e => setWalkInHostName(e.target.value)}
                                                            placeholder="Supervisor or department"
                                                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-purple-200/50 dark:border-purple-800/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleWalkInRegister}
                                            disabled={
                                                walkInGenerating || 
                                                !walkInName.trim() || 
                                                (walkInCategory !== 'parent' && !walkInIdNumber.trim()) || 
                                                (walkInCategory !== 'parent' && !walkInPurpose.trim())
                                            }
                                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-750 hover:to-pink-750 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 shadow-md shadow-purple-600/10 cursor-pointer"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            {walkInGenerating ? 'Generating Pass...' : 'Authorize Entry & Print Pass'}
                                        </button>
                                        <p className="text-[10px] text-slate-450 dark:text-slate-500 text-center font-bold uppercase tracking-wider mt-2.5">Pass prints automatically upon saving.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200/80 dark:border-slate-850">
                                <div className="relative mb-6">
                                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={staffSearchTerm}
                                        onChange={e => {
                                            setStaffSearchTerm(e.target.value);
                                            if (e.target.value.length > 2) setSelectedStaff(null);
                                        }}
                                        className="w-full pl-12 pr-16 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:ring-2 focus:ring-indigo-500 outline-none text-base font-bold h-14 transition-all"
                                        placeholder="Search Staff Name or Role..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setStaffScanning(true)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-xl text-indigo-600 transition-all flex items-center justify-center"
                                        title="Scan Staff QR Code"
                                    >
                                        <CameraIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                                    {staffSearchTerm.length > 1 && filteredStaff.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => { setSelectedStaff(u); setStaffSearchTerm(u.name); }}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                                selectedStaff?.id === u.id
                                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                                                    : 'border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/40 active:scale-[0.98]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center uppercase shadow-inner">
                                                    {u.name.charAt(0)}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-sm text-slate-900 dark:text-white leading-none">{u.name}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1.5">{u.role}</p>
                                                </div>
                                            </div>
                                            <CheckCircleIcon className={`w-6 h-6 ${selectedStaff?.id === u.id ? 'text-indigo-500 opacity-100' : 'opacity-0'}`} />
                                        </button>
                                    ))}
                                    {staffSearchTerm.length > 1 && filteredStaff.length === 0 && (
                                        <div className="text-center py-12">
                                            <UserIcon className="w-14 h-14 text-slate-350 dark:text-slate-750 mx-auto mb-3" />
                                            <p className="text-slate-500 dark:text-slate-450 font-black uppercase text-xs tracking-wider">Staff Member Not Found</p>
                                        </div>
                                    )}
                                    {staffSearchTerm.length <= 1 && !selectedStaff && (
                                        <div className="text-center py-12 bg-slate-50/40 dark:bg-slate-950/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <CameraIcon className="w-14 h-14 text-slate-350 dark:text-slate-750 mx-auto mb-4" />
                                            <p className="text-sm text-slate-500 dark:text-slate-400 px-8 font-medium">Scan teacher ID card barcode or select search results above</p>
                                            <button
                                                onClick={() => setStaffScanning(true)}
                                                className="mt-6 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-750 hover:to-violet-750 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-indigo-600/15"
                                            >
                                                Open ID Scanner
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right side: Actions confirmation / History Feed */}
                    <div className="lg:col-span-5 space-y-6">
                        {activeTab === 'settings' && (
                            <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200/80 dark:border-slate-850 space-y-6">
                                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest mb-2">Printer Connection Status</h3>
                                
                                <div className="p-5 rounded-2.5xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Driver Status</span>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Ready
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Mode</span>
                                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                            {printerConfig.type === 'system' ? 'System Spool' : printerConfig.type === 'bluetooth' ? 'Bluetooth SPP' : 'Network Socket'}
                                        </span>
                                    </div>
                                    {printerConfig.type === 'network' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Endpoint</span>
                                            <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                                                {printerConfig.ipAddress || 'Not set'}:{printerConfig.port || 9100}
                                            </span>
                                        </div>
                                    )}
                                    {printerConfig.type === 'bluetooth' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bluetooth Address</span>
                                            <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                                                {printerConfig.bluetoothAddress || 'Not set'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-slate-455 dark:text-slate-500 text-center uppercase tracking-wide">Verify if your receipt printer prints correctly by sending a mock gatepass ticket.</p>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await printService.printEventPass({
                                                    pin: { pin: 'TEST-1234', guests: '[]', vehicleRegistration: 'KCA 123A' },
                                                    parent: { name: 'Gate Desk Test Parent', phoneNumber: '+254 700 000 000' },
                                                    event: { title: 'Security Spool Connection' },
                                                    institution: currentInstitution || { name: 'Academic Institution' }
                                                });
                                                alert("Test print command successfully dispatched to printer!");
                                            } catch (err: any) {
                                                alert("Test print failed: " + (err.message || err));
                                            }
                                        }}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-750 hover:to-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <PrinterIcon className="w-4.5 h-4.5" /> Send Test Ticket
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'vehicle' && selectedVehicle && (
                            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/60 dark:border-blue-900/30 p-6 rounded-[2.5rem] shadow-lg animate-in fade-in slide-in-from-bottom-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Active Vehicle Selection</p>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1.5">{selectedVehicle.plateNumber}</h3>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedVehicle(null); setSearchTerm(''); }}
                                        className="text-xs font-black text-red-500 hover:text-red-655 uppercase tracking-wider hover:underline"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-widest mb-1.5 ml-1">Driver Notes / Observations</label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-950 border border-blue-200/40 dark:border-blue-800/40 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                                            rows={2}
                                            placeholder="e.g. Transporting grade 4 trip students..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => handleVehicleAction('entry')}
                                            className="py-4.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-green-600/10 flex items-center justify-center gap-2"
                                        >
                                            <ArrowRightOnRectangleIcon className="w-5 h-5 rotate-180" />
                                            Grant Entry
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleVehicleAction('exit')}
                                            className="py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-750 hover:to-indigo-750 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2"
                                        >
                                            <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                            Grant Exit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'staff' && selectedStaff && (
                            <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/10 border border-indigo-200/60 dark:border-indigo-900/30 p-6 rounded-[2.5rem] shadow-lg animate-in fade-in slide-in-from-bottom-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Active Staff Verification</p>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none mt-1.5">{selectedStaff.name}</h3>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedStaff(null)} 
                                        className="text-xs font-black text-red-500 hover:text-red-655 uppercase tracking-wider hover:underline"
                                    >
                                        Clear
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 tracking-widest mb-2 ml-1">Select Gate Shift</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStaffCheckInType('Morning')}
                                                className={`py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border ${
                                                    staffCheckInType === 'Morning'
                                                        ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-600/10'
                                                        : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                                }`}
                                            >
                                                Morning Entry
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStaffCheckInType('Afternoon')}
                                                className={`py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border ${
                                                    staffCheckInType === 'Afternoon'
                                                        ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-600/10'
                                                        : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                                }`}
                                            >
                                                Afternoon Exit
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 tracking-widest mb-1.5 ml-1">Gate Notes / Observations</label>
                                        <textarea
                                            value={staffNotes}
                                            onChange={e => setStaffNotes(e.target.value)}
                                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-950 border border-indigo-200/40 dark:border-indigo-800/40 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                                            rows={2}
                                            placeholder="e.g. Arrived on foot, carrying registry documents..."
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!onTeacherGateCheckIn) {
                                                alert('Gate check-in callback not connected.');
                                                return;
                                            }
                                            try {
                                                await onTeacherGateCheckIn(selectedStaff.id, staffCheckInType, 'School Gate', staffNotes);
                                                alert(`Check-in recorded successfully for ${selectedStaff.name}!`);
                                                
                                                // Sync staff details with Dahua access terminal
                                                await registerUserOnDahua(selectedStaff);
                                                
                                                setStaffNotes('');
                                                setSelectedStaff(null);
                                            } catch (e: any) {
                                                alert(e.message || 'Failed to record check-in.');
                                            }
                                        }}
                                        className="w-full py-4.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-750 hover:to-violet-750 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 mt-4"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Confirm Gate Check-In
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Recent History Desk Logger */}
                        {activeTab !== 'settings' && (
                            <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-200/80 dark:border-slate-850 h-fit">
                                {activeTab === 'vehicle' ? (
                                    <>
                                        <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest mb-6">Gate Log (Today's Vehicles)</h3>
                                        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                                            {recentLogs.map(log => {
                                                const vehicle = vehicles.find(v => v.id === log.vehicleId);
                                                const security = activeUsers.find(u => u.id === log.securityId);
                                                return (
                                                    <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 transition-all shadow-sm">
                                                        <div className={`p-3 rounded-xl h-fit ${log.eventType === 'entry' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                            <ArrowRightOnRectangleIcon className={`w-5 h-5 ${log.eventType === 'entry' ? 'rotate-180' : ''}`} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <p className="font-black text-base text-slate-900 dark:text-white leading-none">{vehicle?.plateNumber || 'Unknown'}</p>
                                                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1.5">{log.eventType === 'entry' ? 'Incoming' : 'Outgoing'} • {security?.name || 'Gate Officer'}</p>
                                                            {log.notes && <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-2.5 italic border-l-2 border-slate-200 dark:border-slate-800 pl-2">"{log.notes}"</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {recentLogs.length === 0 && (
                                                <div className="text-center py-12">
                                                    <ClockIcon className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto mb-2 animate-pulse" />
                                                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">No vehicle activity logged today</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : activeTab === 'parent' ? (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest">Gate Log (Today's Guests)</h3>
                                            <button 
                                                onClick={fetchHistoryAndEvents} 
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all"
                                                title="Refresh Check-ins"
                                            >
                                            </button>
                                        </div>
                                        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in">
                                            {(() => {
                                                const checkedInPins = allEventPins
                                                    .filter(p => p.status === 'used')
                                                    .map(p => {
                                                        const parent = activeUsers.find(u => u.id === p.userId);
                                                        const parentName = parent?.name || 'Invited Guest';
                                                        const event = allEvents.find(e => e.id === p.eventId);
                                                        const student = activeUsers.find(u => 
                                                            u.role === 'student' && (
                                                                u.parentIds?.includes(p.userId) || 
                                                                parent?.studentIds?.includes(u.id) || 
                                                                phonesMatch((u as any).parentPhone || '', parent?.phoneNumber || '')
                                                            )
                                                        );
                                                        return {
                                                            type: 'pin' as const,
                                                            id: p.id,
                                                            time: p.updatedAt || p.createdAt || new Date().toISOString(),
                                                            name: parentName,
                                                            phoneNumber: parent?.phoneNumber || '',
                                                            subtitle: `Pass PIN: ${p.pin}`,
                                                            details: `Event: ${event?.title || 'Institution Event'}`,
                                                            studentName: student?.name,
                                                            status: 'checked_in',
                                                            raw: p,
                                                            rawParent: parent,
                                                            rawEvent: event,
                                                            rawStudent: student
                                                        };
                                                    });

                                                const walkIns = (visitors || [])
                                                    .map(v => {
                                                        return {
                                                            type: 'walkin' as const,
                                                            id: v.id,
                                                            time: `${v.visitDate || todayStr}T${v.timeIn || '00:00'}`,
                                                            name: v.name || 'Walk-in Visitor',
                                                            phoneNumber: v.phoneNumber || '',
                                                            subtitle: v.idNumber ? `ID: ${v.idNumber}` : 'Walk-in Guest',
                                                            details: v.purpose || 'General Entry',
                                                            studentName: undefined,
                                                            status: v.status || (v.timeOut ? 'checked_out' : 'checked_in'),
                                                            raw: v,
                                                            rawParent: undefined,
                                                            rawEvent: undefined,
                                                            rawStudent: undefined
                                                        };
                                                    });

                                                const consolidated = [...checkedInPins, ...walkIns]
                                                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                                                    .slice(0, 15);

                                                if (consolidated.length === 0) {
                                                    return (
                                                        <div className="text-center py-12">
                                                            <UserGroupIcon className="w-12 h-12 text-slate-350 dark:text-slate-750 mx-auto mb-2 animate-pulse" />
                                                            <p className="text-slate-400 dark:text-slate-550 text-[10px] font-black uppercase tracking-widest">No guest activity logged today</p>
                                                        </div>
                                                    );
                                                }

                                                return consolidated.map(item => {
                                                    const isCheckedIn = item.status === 'checked_in';
                                                    return (
                                                        <div key={item.id} className="p-4.5 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 space-y-3.5 transition-all shadow-sm">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="font-black text-sm text-slate-900 dark:text-white uppercase leading-tight">{item.name}</p>
                                                                    <p className="text-[9px] text-purple-650 dark:text-purple-400 font-black uppercase tracking-widest mt-1">{item.subtitle}</p>
                                                                </div>
                                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                                                    isCheckedIn 
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20' 
                                                                        : 'bg-slate-200/50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                                                }`}>
                                                                    {isCheckedIn ? 'Checked In' : 'Checked Out'}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase space-y-1.5 leading-relaxed bg-white/50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/30 dark:border-slate-850">
                                                                <p className="line-clamp-2"><span className="text-slate-400">Activity:</span> {item.details}</p>
                                                                {item.studentName && <p><span className="text-slate-400">Student:</span> {item.studentName}</p>}
                                                                {item.phoneNumber && <p><span className="text-slate-400">Contact:</span> {item.phoneNumber}</p>}
                                                            </div>
                                                            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                                                                {item.type === 'pin' ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedPin(item.raw);
                                                                                setSelectedParent(item.rawParent || {
                                                                                    id: item.raw.userId,
                                                                                    name: item.name,
                                                                                    phoneNumber: item.phoneNumber,
                                                                                    role: 'parent',
                                                                                    institutionId: currentInstitution.id
                                                                                } as any);
                                                                                setAssociatedEvent(item.rawEvent || null);
                                                                                setSelectedStudent(item.rawStudent || null);
                                                                            }}
                                                                            className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                                                        >
                                                                            View Details
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                printEposGatePass(item.raw, item.rawParent || { name: item.name }, item.rawEvent || { title: 'Institution Event' }, currentInstitution);
                                                                            }}
                                                                            className="flex-1 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer"
                                                                        >
                                                                            <PrinterIcon className="w-3.5 h-3.5" /> Reprint Ticket
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {isCheckedIn && onCheckoutVisitor && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    if (window.confirm(`Are you sure you want to check out ${item.name}?`)) {
                                                                                        await onCheckoutVisitor(item.id);
                                                                                        alert(`${item.name} checked out successfully.`);
                                                                                        fetchHistoryAndEvents();
                                                                                    }
                                                                                }}
                                                                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-red-650/10 cursor-pointer"
                                                                            >
                                                                                Check Out
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                printEposWalkInGatePass(
                                                                                    item.raw,
                                                                                    { name: item.raw.hostName || 'Security Gate', role: 'Staff' } as any,
                                                                                    currentInstitution
                                                                                );
                                                                            }}
                                                                            className="flex-1 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-550/10 cursor-pointer"
                                                                        >
                                                                            <PrinterIcon className="w-3.5 h-3.5" /> Reprint Ticket
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest mb-6">Gate Log (Today's Staff)</h3>
                                        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                                            {((teacherCheckIns || []) as any[])
                                                .filter(c => (c.checkInDate || c.check_in_date) === todayStr)
                                                .sort((a, b) => {
                                                    const timeA = a.morningCheckInTime || a.morning_check_in_time || a.afternoonCheckInTime || a.afternoon_check_in_time || '';
                                                    const timeB = b.morningCheckInTime || b.morning_check_in_time || b.afternoonCheckInTime || b.afternoon_check_in_time || '';
                                                    return timeB.localeCompare(timeA);
                                                })
                                                .map(c => {
                                                    const teacherId = c.teacherId || c.teacher_id;
                                                    const staff = activeUsers.find(u => u.id === teacherId);
                                                    if (!staff) return null;
                                                    const morningTime = c.morningCheckInTime || c.morning_check_in_time;
                                                    const afternoonTime = c.afternoonCheckInTime || c.afternoon_check_in_time;
                                                    const morningNotes = c.morningNotes || c.morning_notes;
                                                    const afternoonNotes = c.afternoonNotes || c.afternoon_notes;
                                                    const notes = morningNotes || afternoonNotes;
                                                    return (
                                                        <div key={c.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 transition-all shadow-sm">
                                                            <div className="p-3 rounded-xl h-fit bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                                <ClockIcon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">{staff.name}</h4>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">{staff.role}</p>
                                                                    </div>
                                                                    <div className="flex flex-col gap-1 items-end">
                                                                        {morningTime && (
                                                                            <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                                                                                IN: {morningTime.substring(0, 5)}
                                                                            </span>
                                                                        )}
                                                                        {afternoonTime && (
                                                                            <span className="text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                                                                                OUT: {afternoonTime.substring(0, 5)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {notes && (
                                                                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-3.5 italic border-l-2 border-slate-200 dark:border-slate-800 pl-2">
                                                                        "{notes}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            {((teacherCheckIns || []) as any[]).filter(c => (c.checkInDate || c.check_in_date) === todayStr).length === 0 && (
                                                <div className="text-center py-12 animate-fade-in">
                                                    <ClockIcon className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto mb-2 animate-pulse" />
                                                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">No staff check-ins logged today</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Viewfinder Cam Modals (Optimized for Guard Desk viewports) */}
            {scanning && activeTab === 'vehicle' && (
                <div className="fixed inset-0 bg-slate-950/90 z-[200] flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <div className="w-full max-w-md text-center space-y-6">
                        <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-slate-900 rounded-[2.5rem] border-4 border-blue-500 overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-slate-950/40">
                                <QrCodeIcon className="w-24 h-24 text-blue-500/20 mb-4 animate-pulse" />
                                <p className="text-blue-500 font-black uppercase text-[10px] tracking-widest mb-6">Camera Viewfinder Active</p>
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button
                                        onClick={() => {
                                            if (vehicles.length > 0) {
                                                const v = vehicles[0];
                                                setSelectedVehicle(v);
                                                setSearchTerm(v.plateNumber);
                                                setScanning(false);
                                            }
                                        }}
                                        className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Simulate Scan
                                    </button>
                                    <button
                                        onClick={() => setScanning(false)}
                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_#3b82f6] animate-[scan_3s_infinite]"></div>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Align Plate Barcode</h3>
                        <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">Position barcode/QR within the camera scanner frame</p>
                    </div>
                    <style>{`
                        @keyframes scan {
                            0% { transform: translateY(0); }
                            50% { transform: translateY(320px); }
                            100% { transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}

            {parentScanning && (
                <div className="fixed inset-0 bg-slate-950/90 z-[200] flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <div className="w-full max-w-lg text-center flex flex-col items-center space-y-6">
                        <div className="relative aspect-square w-full max-w-[280px] bg-slate-900 rounded-[2.5rem] border-4 border-purple-500 overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/40">
                                <QrCodeIcon className="w-20 h-20 text-purple-500/20 mb-4 animate-pulse" />
                                <p className="text-purple-400 font-black uppercase text-[10px] tracking-widest mb-6">Camera Viewfinder Active</p>
                                <button
                                    onClick={() => setParentScanning(false)}
                                    className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel Scan
                                </button>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_20px_#a855f7] animate-[scan_3s_infinite]"></div>
                        </div>
                        
                        {/* Simulation Select Panel */}
                        <div className="w-full bg-slate-900/90 border border-slate-850 rounded-3xl p-5 text-left space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-450">Active Invitation Gate Passes</h4>
                                {loadingPins && <span className="text-[10px] font-black text-purple-400 animate-pulse uppercase">Syncing...</span>}
                            </div>
                            
                            <input 
                                type="text"
                                value={scanFilter}
                                onChange={e => setScanFilter(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-purple-500 outline-none text-xs text-white"
                                placeholder="Filter passes by invitee name..."
                            />

                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                                {scannablePins.filter(p => {
                                    const parent = activeUsers.find(u => u.id === p.userId);
                                    const parentName = parent?.name || 'Invited Guest';
                                    const searchStr = `${parentName} ${p.pin} ${p.guests || ''}`.toLowerCase();
                                    return searchStr.includes(scanFilter.toLowerCase());
                                }).map((p: any) => {
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
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-purple-950/20 border border-slate-800 hover:border-purple-500/30 transition-all text-left group"
                                        >
                                            <div>
                                                <p className="text-xs font-black text-white group-hover:text-purple-400 transition-colors">{parentName}</p>
                                                {parentPhone && <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{parentPhone}</p>}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black font-mono bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-md border border-purple-500/20">
                                                    PIN: {p.pin}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {staffScanning && (
                <div className="fixed inset-0 bg-slate-950/90 z-[200] flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <div className="w-full max-w-lg text-center flex flex-col items-center space-y-6">
                        <div className="relative aspect-square w-full max-w-[280px] bg-slate-900 rounded-[2.5rem] border-4 border-indigo-500 overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.3)]">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/40">
                                <QrCodeIcon className="w-20 h-20 text-indigo-500/20 mb-4 animate-pulse" />
                                <p className="text-indigo-455 font-black uppercase text-[10px] tracking-widest mb-6">Camera Viewfinder Active</p>
                                <button
                                    onClick={() => setStaffScanning(false)}
                                    className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel Scan
                                </button>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_#6366f1] animate-[scan_3s_infinite]"></div>
                        </div>
                        
                        {/* Simulation Select Panel */}
                        <div className="w-full bg-slate-900/90 border border-slate-850 rounded-3xl p-5 text-left space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-450">Staff ID RFID / QR Database</h4>
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                                {filteredStaff.map(u => (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedStaff(u);
                                            setStaffScanning(false);
                                        }}
                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-indigo-950/20 border border-slate-800 hover:border-indigo-500/35 transition-all text-left"
                                    >
                                        <div>
                                            <p className="text-xs font-black text-white">{u.name}</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{u.role}</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                                            Simulate RFID Scan
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
