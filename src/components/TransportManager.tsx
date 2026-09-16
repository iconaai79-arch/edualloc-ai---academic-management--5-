
import React, { useState, useEffect, useMemo } from 'react';
import { TruckIcon } from './icons/TruckIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { UserIcon } from './icons/UserIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';

import type { TransportVehicle, User, Institution, UserUpdateData, StudentEnrollment, Course } from '../types';
import { apiService } from '../services/apiService';

interface TransportManagerProps {
    vehicles: TransportVehicle[];
    users: User[];
    currentInstitution: Institution;
    courses?: Course[];
    onAddVehicle: (vehicle: Omit<TransportVehicle, 'id'>) => Promise<void>;
    onUpdateVehicle: (id: string, updates: Partial<TransportVehicle>) => Promise<void>;
    onDeleteVehicle: (id: string) => Promise<void>;
    onAddUser?: (userData: any) => Promise<void>;
    onEditUser?: (userId: string, data: UserUpdateData) => Promise<void>;
}

export const TransportManager: React.FC<TransportManagerProps> = ({
    vehicles, users, currentInstitution, courses: initialCourses = [],
    onAddVehicle, onUpdateVehicle, onDeleteVehicle,
    onAddUser, onEditUser
}) => {
    const isLogistics = currentInstitution.institutionType === 'Logistics' || 
                       currentInstitution.category === 'Cargo & Delivery' || 
                       currentInstitution.category === 'Staff Shuttle' ||
                       currentInstitution.category === 'Public Transport';
                       
    const passengerTerm = isLogistics ? 'Passenger/Client' : 'Student';
    const registryTerm = isLogistics ? 'Manifest/Boarding' : 'Student Assignment';

    const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'students'>('vehicles');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [streamFilter, setStreamFilter] = useState('all');

    // Enrollment and courses data for admission numbers, class & stream
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [loadedCourses, setLoadedCourses] = useState<Course[]>(initialCourses);

    const instId = currentInstitution?.id || '';
    const [studentVehicleMap, setStudentVehicleMap] = useState<Record<string, string>>(() => {
        const initialMap: Record<string, string> = {};
        users.forEach(u => {
            const vId = (u as any).vehicle_id || (u as any).vehicleId || (u as any).assignedVehicleId || (u as any).assigned_vehicle_id || u.metadata?.vehicleId || u.metadata?.assignedVehicleId || u.metadata?.vehicle_id;
            if (vId && String(vId).trim() !== '' && String(vId).toLowerCase() !== 'unassigned') {
                initialMap[u.id] = String(vId).trim();
            }
        });
        try {
            const cached = localStorage.getItem(`eduai_transport_student_vehicles_${instId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                return { ...initialMap, ...parsed };
            }
        } catch (e) {}
        return initialMap;
    });

    useEffect(() => {
        const fromUsers: Record<string, string> = {};
        users.forEach(u => {
            const vId = (u as any).vehicle_id || (u as any).vehicleId || (u as any).assignedVehicleId || (u as any).assigned_vehicle_id || u.metadata?.vehicleId || u.metadata?.assignedVehicleId || u.metadata?.vehicle_id;
            if (vId && String(vId).trim() !== '' && String(vId).toLowerCase() !== 'unassigned') {
                fromUsers[u.id] = String(vId).trim();
            }
        });

        let cachedMap: Record<string, string> = {};
        if (instId) {
            try {
                const cached = localStorage.getItem(`eduai_transport_student_vehicles_${instId}`);
                if (cached) cachedMap = JSON.parse(cached);
            } catch (e) {}
        }

        setStudentVehicleMap(prev => ({
            ...cachedMap,
            ...fromUsers,
            ...prev
        }));
    }, [users, instId]);

    // Form data for Vehicle
    const [formData, setFormData] = useState<Omit<TransportVehicle, 'id' | 'institutionId'>>({
        plateNumber: '',
        model: '',
        vehicleType: 'school',
        capacity: 14,
        status: 'active'
    });

    // Form data for Driver
    const [driverFormData, setDriverFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        staffId: '',
        driverType: 'staff' as 'staff' | 'private'
    });

    const [showQrId, setShowQrId] = useState<string | null>(null);
    const [qrUrl, setQrUrl] = useState<string>('');

    // Strictly scope users to current institution to prevent cross-institution data bleed
    const institutionUsers = useMemo(() => {
        if (!currentInstitution?.id) return users;
        return users.filter(u => {
            const instId = u.institutionId || (u as any).institution_id || (u as any).schoolId;
            return instId === currentInstitution.id;
        });
    }, [users, currentInstitution?.id]);

    const drivers = useMemo(() =>
        institutionUsers.filter(u => u.role === 'driver' || u.roles?.includes('driver')),
        [institutionUsers]
    );

    const assistants = useMemo(() =>
        institutionUsers.filter(u => u.role === 'transport_assistant' || u.roles?.includes('transport_assistant')),
        [institutionUsers]
    );

    const students = useMemo(() =>
        institutionUsers.filter(u => u.role === 'student'),
        [institutionUsers]
    );

    // Strictly scope courses and enrollments to current institution
    const institutionCourses = useMemo(() => {
        if (!currentInstitution?.id) return loadedCourses;
        return loadedCourses.filter(c => {
            const instId = c.institutionId || (c as any).institution_id || (c as any).schoolId;
            return !instId || instId === currentInstitution.id;
        });
    }, [loadedCourses, currentInstitution?.id]);

    const institutionEnrollments = useMemo(() => {
        if (!currentInstitution?.id) return enrollments;
        return enrollments.filter(e => {
            const instId = e.institutionId || (e as any).institution_id || (e as any).schoolId;
            return !instId || instId === currentInstitution.id;
        });
    }, [enrollments, currentInstitution?.id]);

    // Helper to format class name cleanly in Title Case / clean capitalization matching school standards
    const normalizeClassName = (raw: string, registeredCourses: Course[]): string => {
        const trimmed = raw.trim();
        if (!trimmed || trimmed.toLowerCase() === 'unassigned') return '';
        // If there is an exact case-insensitive match in registered courses, use official course name!
        const matchedCourse = registeredCourses.find(c => c.name && c.name.trim().toLowerCase() === trimmed.toLowerCase());
        if (matchedCourse?.name) {
            return matchedCourse.name.trim();
        }
        // Normalize "FORM 3" -> "Form 3", "GRADE 4" -> "Grade 4"
        return trimmed.replace(/\b([a-z])([a-z]+)?\b/gi, (match, p1, p2) => {
            if (/^(pp|cbc|ecd|dpt|kg)\d*$/i.test(match)) return match.toUpperCase();
            return p1.toUpperCase() + (p2 ? p2.toLowerCase() : '');
        });
    };

    // Merge enrollment and course data (admissionNumber, class, stream) onto each student
    const enrichedStudents = useMemo(() => {
        return students.map(s => {
            const enr = institutionEnrollments.find(e => e.userId === s.id || e.id === s.id || (e.metadata as any)?.userId === s.id);
            const matchedCourse = institutionCourses.find(c => 
                c.id === enr?.courseId || 
                c.id === (s as any).courseId || 
                c.id === s.metadata?.courseId ||
                (c.name && enr?.metadata?.gradeLevel && c.name.trim().toLowerCase() === String(enr.metadata.gradeLevel).trim().toLowerCase())
            );
            const adm = enr?.admissionNumber || (enr as any)?.admission_number || enr?.metadata?.admissionNumber ||
                s.admissionNumber || s.admission_number ||
                s.metadata?.admissionNumber || s.metadata?.admission_number || '';
            const rawGrade = (
                matchedCourse?.name ||
                enr?.metadata?.gradeLevel ||
                enr?.metadata?.className ||
                (s as any).studentClass ||
                (s as any).className ||
                s.metadata?.studentClass ||
                s.metadata?.className ||
                s.metadata?.gradeLevel ||
                (s as any).gradeLevel ||
                ''
            ).trim();
            const gradeLevel = normalizeClassName(rawGrade, institutionCourses);
            const stream = (
                enr?.metadata?.stream ||
                enr?.metadata?.streamName ||
                (s as any).stream ||
                s.metadata?.stream ||
                s.metadata?.streamName ||
                ''
            ).trim();
            return { 
                ...s, 
                admissionNumber: adm, 
                admission_number: adm, 
                gradeLevel, 
                stream,
                courseId: matchedCourse?.id || enr?.courseId || (s as any).courseId || '' 
            };
        });
    }, [students, institutionEnrollments, institutionCourses]);

    // Unique class & stream options for filter dropdowns strictly for this institution
    const classOptions = useMemo(() => {
        const map = new Map<string, string>(); // lowerCaseKey -> displayValue

        // 1. Registered school courses are the primary authority
        institutionCourses.forEach(c => {
            if (c.name && c.name.trim()) {
                const norm = c.name.trim();
                map.set(norm.toLowerCase(), norm);
            }
        });

        // 2. Add from enrollments only if valid and not already mapped
        institutionEnrollments.forEach(e => {
            const g = e.metadata?.gradeLevel || e.metadata?.className;
            if (g && String(g).trim()) {
                const norm = normalizeClassName(String(g), institutionCourses);
                if (norm && !map.has(norm.toLowerCase())) {
                    map.set(norm.toLowerCase(), norm);
                }
            }
        });

        // 3. Add from enrolled students in this institution
        enrichedStudents.forEach(s => {
            const g = (s as any).gradeLevel;
            if (g && String(g).trim()) {
                const norm = normalizeClassName(String(g), institutionCourses);
                if (norm && !map.has(norm.toLowerCase())) {
                    map.set(norm.toLowerCase(), norm);
                }
            }
        });

        // Sort classes naturally (e.g. Form 1, Form 2, Form 3, Form 4)
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [institutionCourses, institutionEnrollments, enrichedStudents]);

    const streamOptions = useMemo(() => {
        const map = new Map<string, string>(); // lowerCaseKey -> displayValue

        institutionCourses.forEach(c => {
            if (Array.isArray(c.streams)) {
                c.streams.forEach(s => {
                    if (s && String(s).trim()) {
                        const trimmed = String(s).trim();
                        map.set(trimmed.toLowerCase(), trimmed);
                    }
                });
            }
            if (Array.isArray((c as any).metadata?.streams)) {
                (c as any).metadata.streams.forEach((s: any) => {
                    if (s && String(s).trim()) {
                        const trimmed = String(s).trim();
                        map.set(trimmed.toLowerCase(), trimmed);
                    }
                });
            }
        });

        institutionEnrollments.forEach(e => {
            const st = e.metadata?.stream || e.metadata?.streamName;
            if (st && String(st).trim()) {
                const trimmed = String(st).trim();
                map.set(trimmed.toLowerCase(), trimmed);
            }
        });

        enrichedStudents.forEach(s => {
            const st = (s as any).stream;
            if (st && String(st).trim()) {
                const trimmed = String(st).trim();
                map.set(trimmed.toLowerCase(), trimmed);
            }
        });

        return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [institutionCourses, institutionEnrollments, enrichedStudents]);

    const filteredStudents = useMemo(() => {
        return enrichedStudents.filter(s => {
            const adm = (s as any).admissionNumber || '';
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                adm.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.staffId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((s as any).gradeLevel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((s as any).stream || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClass = classFilter === 'all' || 
                (s as any).gradeLevel?.toLowerCase() === classFilter.toLowerCase() ||
                (s as any).courseId === classFilter;
            const matchesStream = streamFilter === 'all' || 
                (s as any).stream?.toLowerCase() === streamFilter.toLowerCase();
            return matchesSearch && matchesClass && matchesStream;
        });
    }, [enrichedStudents, searchTerm, classFilter, streamFilter]);

    // Fetch student enrollments and courses to get admission numbers, class and stream
    useEffect(() => {
        if (!currentInstitution?.id) return;

        // Load enrollments
        apiService.fetchModuleRecords<StudentEnrollment>('student_enrollments', currentInstitution.id)
            .then(data => setEnrollments(data || []))
            .catch(e => console.warn('Could not load enrollments for transport:', e));

        // Load courses if not passed via props
        if (!initialCourses || initialCourses.length === 0) {
            apiService.fetchCourses(currentInstitution.id)
                .then(data => {
                    if (data && data.length > 0) setLoadedCourses(data);
                })
                .catch(e => console.warn('Could not load courses for transport manager:', e));
        }
    }, [currentInstitution.id, initialCourses]);

    useEffect(() => {
        if (initialCourses && initialCourses.length > 0) {
            setLoadedCourses(initialCourses);
        }
    }, [initialCourses]);

    useEffect(() => {
        if (showQrId) {
            const QRCodeLib = (window as any).QRCode;
            if (QRCodeLib) {
                const vehicle = vehicles.find(v => v.id === showQrId);
                if (vehicle) {
                    const data = JSON.stringify({
                        type: 'vehicle_gate_pass',
                        id: vehicle.id,
                        plate: vehicle.plateNumber,
                        inst: currentInstitution.id
                    });
                    QRCodeLib.toDataURL(data, { width: 512, margin: 2 }, (err: any, url: string) => {
                        if (!err) setQrUrl(url);
                    });
                }
            }
        } else {
            setQrUrl('');
        }
    }, [showQrId, vehicles, currentInstitution]);

    const handleVehicleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await onUpdateVehicle(editingId, formData);
                setEditingId(null);
            } else {
                await onAddVehicle({ ...formData, institutionId: currentInstitution.id } as any);
                setIsAdding(false);
            }
            setFormData({
                plateNumber: '',
                model: '',
                vehicleType: 'school',
                capacity: 14,
                status: 'active'
            });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDriverSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onAddUser) return;
        try {
            await onAddUser({
                ...driverFormData,
                role: 'driver',
                roles: ['driver'],
                institutionId: currentInstitution.id,
                expertise: []
            });
            setIsAdding(false);
            setDriverFormData({ name: '', email: '', phoneNumber: '', staffId: '', driverType: 'staff' });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleStudentAssignment = async (studentId: string, vehicleId: string) => {
        const cleanVId = (vehicleId && vehicleId.trim() !== '' && vehicleId.toLowerCase() !== 'unassigned') ? vehicleId.trim() : '';
        setStudentVehicleMap(prev => {
            const updated = { ...prev };
            if (cleanVId) {
                updated[studentId] = cleanVId;
            } else {
                delete updated[studentId];
            }
            try {
                localStorage.setItem(`eduai_transport_student_vehicles_${instId}`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
        });

        if (!onEditUser) return;
        try {
            await onEditUser(studentId, {
                vehicleId: cleanVId ? cleanVId : null,
                assignedVehicleId: cleanVId ? cleanVId : null,
                vehicle_id: cleanVId ? cleanVId : null
            } as any);
        } catch (error: any) {
            console.error('Failed to update student vehicle assignment:', error);
            alert(error.message);
        }
    };

    const startEdit = (v: TransportVehicle) => {
        setEditingId(v.id);
        setFormData({
            plateNumber: v.plateNumber,
            model: v.model,
            vehicleType: v.vehicleType,
            capacity: v.capacity,
            driverId: v.driverId,
            assistantId: v.assistantId,
            status: v.status
        });
        setIsAdding(true);
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black flex items-center gap-3 text-slate-800 dark:text-white uppercase tracking-tighter">
                        <TruckIcon className="w-10 h-10 text-indigo-600" />
                        Transport Management
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">Manage vehicles, drivers, and {passengerTerm.toLowerCase()} assignments.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-bold active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" />
                        {activeTab === 'vehicles' ? 'Register Vehicle' : activeTab === 'drivers' ? 'Register Driver' : `Assign ${passengerTerm}`}
                    </button>
                )}
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl mb-8 w-fit border border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => { setActiveTab('vehicles'); setIsAdding(false); }}
                    className={`px-8 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'vehicles' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Vehicles
                </button>
                <button
                    onClick={() => { setActiveTab('drivers'); setIsAdding(false); }}
                    className={`px-8 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'drivers' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Drivers
                </button>
                <button
                    onClick={() => { setActiveTab('students'); setIsAdding(false); }}
                    className={`px-8 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === 'students' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {registryTerm}
                </button>
            </div>

            {isAdding && activeTab === 'vehicles' && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl mb-8 border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                        {editingId ? 'Edit Vehicle Details' : 'Register New Vehicle'}
                    </h3>
                    <form onSubmit={handleVehicleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Plate Number</label>
                            <input
                                required
                                value={formData.plateNumber}
                                onChange={e => setFormData({ ...formData, plateNumber: e.target.value })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                                placeholder="e.g. KCA 123X"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Make & Model</label>
                            <input
                                required
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                                placeholder="e.g. Isuzu FRR"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Capacity (Seats)</label>
                            <input
                                type="number"
                                required
                                value={formData.capacity}
                                onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Vehicle Type</label>
                            <select
                                value={formData.vehicleType}
                                onChange={e => setFormData({ ...formData, vehicleType: e.target.value as any })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                            >
                                <option value="school">School Owned</option>
                                <option value="private">Private (Consourced)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Assigned Driver</label>
                            <select
                                value={formData.driverId || ''}
                                onChange={e => setFormData({ ...formData, driverId: e.target.value || undefined })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                            >
                                <option value="">Not Assigned</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Assigned Assistant</label>
                            <select
                                value={formData.assistantId || ''}
                                onChange={e => setFormData({ ...formData, assistantId: e.target.value || undefined })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                            >
                                <option value="">Not Assigned</option>
                                {assistants.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className="px-8 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold uppercase text-[10px] tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                            >
                                {editingId ? 'Update Vehicle' : 'Register Vehicle'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {isAdding && activeTab === 'drivers' && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl mb-8 border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-slate-200 uppercase tracking-tight">Register New Driver</h3>
                    <form onSubmit={handleDriverSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Full Name</label>
                            <input
                                required
                                value={driverFormData.name}
                                onChange={e => setDriverFormData({ ...driverFormData, name: e.target.value })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Email Address</label>
                            <input
                                required
                                type="email"
                                value={driverFormData.email}
                                onChange={e => setDriverFormData({ ...driverFormData, email: e.target.value })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                                placeholder="driver@inst.edu"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Phone Number</label>
                            <input
                                required
                                value={driverFormData.phoneNumber}
                                onChange={e => setDriverFormData({ ...driverFormData, phoneNumber: e.target.value })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                                placeholder="254700000000"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Staff ID</label>
                            <input
                                required
                                value={driverFormData.staffId}
                                onChange={e => setDriverFormData({ ...driverFormData, staffId: e.target.value })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                                placeholder="DRV001"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Driver Type</label>
                            <select
                                value={driverFormData.driverType}
                                onChange={e => setDriverFormData({ ...driverFormData, driverType: e.target.value as any })}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 focus:border-indigo-500 outline-none transition-colors font-bold"
                            >
                                <option value="staff">Official Staff</option>
                                <option value="private">Private / Outsourced</option>
                            </select>
                        </div>
                        <div className="lg:col-span-4 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-8 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold uppercase text-[10px] tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                            >
                                Register Driver
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'vehicles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {vehicles.map(vehicle => {
                        const assignedStudentsCount = users.filter(u => {
                            const vId = studentVehicleMap[u.id] !== undefined 
                                ? studentVehicleMap[u.id] 
                                : ((u as any).vehicle_id || u.vehicleId || (u as any).assignedVehicleId || u.metadata?.vehicleId || u.metadata?.assignedVehicleId);
                            return vId === vehicle.id;
                        }).length;
                        return (
                            <div key={vehicle.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1">
                                <div className={`h-3 w-full ${vehicle.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <div className="p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <span className={`text-[9px] uppercase font-black px-3 py-1 rounded-full tracking-widest ${vehicle.vehicleType === 'school' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {vehicle.vehicleType} Owned
                                            </span>
                                            <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-3 uppercase tracking-tight">{vehicle.plateNumber}</h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{vehicle.model}</p>
                                        </div>
                                        <button
                                            onClick={() => setShowQrId(vehicle.id)}
                                            className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all"
                                            title="View Gate Pass QR"
                                        >
                                            <QrCodeIcon className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="space-y-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                                <UserIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Driver</p>
                                                <p className="font-bold text-slate-700 dark:text-slate-200">
                                                    {users.find(u => u.id === vehicle.driverId)?.name || 'None Assigned'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                                                <UserIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Transport Assistant</p>
                                                <p className="font-bold text-slate-700 dark:text-slate-200">
                                                    {users.find(u => u.id === vehicle.assistantId)?.name || 'None Assigned'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                                <TruckIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Capacity</p>
                                                <p className="font-bold text-slate-700 dark:text-slate-200">
                                                    {assignedStudentsCount} / {vehicle.capacity} {passengerTerm}s
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => startEdit(vehicle)}
                                            className="flex-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-4 rounded-2xl transition-all active:scale-95"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => { if (confirm('Delete this vehicle?')) onDeleteVehicle(vehicle.id) }}
                                            className="flex-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 py-4 rounded-2xl transition-all active:scale-95"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {vehicles.length === 0 && !isAdding && (
                        <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
                            <TruckIcon className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tight">No Vehicles Found</h3>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all"
                            >
                                Register First Vehicle
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'drivers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {drivers.map(driver => {
                        const assignedVehicle = vehicles.find(v => v.driverId === driver.id);
                        return (
                            <div key={driver.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <UserIcon className="w-10 h-10" />
                                </div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{driver.name}</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">{driver.staffId || 'NO STAFF ID'}</p>

                                <div className="w-full bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl mb-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Vehicle Assigned</span>
                                        <span className={`font-bold ${assignedVehicle ? 'text-indigo-600' : 'text-slate-400 italic'}`}>
                                            {assignedVehicle ? assignedVehicle.plateNumber : 'Not Assigned'}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                        <CheckIcon className="w-4 h-4 text-green-500" />
                                        {driver.phoneNumber || 'No phone'}
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                        <CheckIcon className="w-4 h-4 text-green-500" />
                                        {driver.email}
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${driver.driverType === 'private' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {driver.driverType || 'staff'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'students' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between gap-6">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-16 pr-6 py-4 rounded-2xl bg-white dark:bg-slate-800 border-none outline-none font-bold text-sm shadow-sm"
                                placeholder="Search by name or student ID..."
                            />
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <select
                                value={classFilter}
                                onChange={e => setClassFilter(e.target.value)}
                                className="px-5 py-4 rounded-2xl bg-white dark:bg-slate-800 border-none outline-none font-bold text-sm shadow-sm min-w-[160px]"
                            >
                                <option value="all">All Classes</option>
                                {classOptions.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <select
                                value={streamFilter}
                                onChange={e => setStreamFilter(e.target.value)}
                                className="px-5 py-4 rounded-2xl bg-white dark:bg-slate-800 border-none outline-none font-bold text-sm shadow-sm min-w-[140px]"
                            >
                                <option value="all">All Streams</option>
                                {streamOptions.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50">
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">{passengerTerm}</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Adm. No</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Class / Stream</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Assigned Vehicle</th>
                                    <th className="px-8 py-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center font-black">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-white">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                            {(student as any).admissionNumber || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                {(student as any).gradeLevel ? (
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{(student as any).gradeLevel}</span>
                                                ) : null}
                                                {(student as any).stream ? (
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{(student as any).stream}</span>
                                                ) : null}
                                                {!(student as any).gradeLevel && !(student as any).stream && (
                                                    <span className="text-slate-300 dark:text-slate-600 italic text-xs">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {(() => {
                                                const assignedVehId = studentVehicleMap[student.id] !== undefined
                                                    ? studentVehicleMap[student.id]
                                                    : (student.vehicleId || (student as any).metadata?.vehicleId || '');
                                                return (
                                                    <select
                                                        value={assignedVehId}
                                                        onChange={e => handleStudentAssignment(student.id, e.target.value)}
                                                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="">No Vehicle Assigned</option>
                                                        {vehicles.map(v => (
                                                            <option key={v.id} value={v.id}>{v.plateNumber} ({v.model})</option>
                                                        ))}
                                                    </select>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {(() => {
                                                const assignedVehId = studentVehicleMap[student.id] !== undefined
                                                    ? studentVehicleMap[student.id]
                                                    : (student.vehicleId || (student as any).metadata?.vehicleId || '');
                                                return assignedVehId ? (
                                                    <button
                                                        onClick={() => handleStudentAssignment(student.id, '')}
                                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-100 transition-all"
                                                    >
                                                        Unassign
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase italic">Pending</span>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center font-black text-slate-300 uppercase tracking-widest">No {passengerTerm.toLowerCase()}s found matching your criteria</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showQrId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowQrId(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-8 text-center">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Vehicle Gate Pass</h3>
                                <button onClick={() => setShowQrId(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-10 rounded-[2.5rem] mb-8 relative border border-slate-100 dark:border-slate-800">
                                {qrUrl ? (
                                    <img loading="lazy" src={qrUrl} alt="Gate Pass QR" className="mx-auto w-full max-w-[250px] mix-blend-multiply dark:mix-blend-normal" />
                                ) : (
                                    <div className="w-48 h-48 bg-slate-200 mx-auto animate-pulse flex items-center justify-center rounded-3xl">Generating QR...</div>
                                )}
                                <div className="mt-8">
                                    <p className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-[0.2em] uppercase">
                                        {vehicles.find(v => v.id === showQrId)?.plateNumber}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.3em] font-black">Official Transport QR</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => window.print()}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Print Pass
                                </button>
                                <button
                                    onClick={() => setShowQrId(null)}
                                    className="w-full bg-slate-100 dark:bg-slate-700 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-8 uppercase tracking-[0.2em] font-black leading-relaxed">
                                Security Personnel must scan this code<br />at every entry or exit point
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

