import React, { useState, useMemo } from 'react';
import { 
    UsersIcon, 
    TruckIcon, 
    CalendarDaysIcon, 
    ClipboardListIcon, 
    SettingsIcon,
    PlusIcon,
    SearchIcon,
    PhoneIcon,
    ChevronRightIcon,
    MapPinIcon,
    CheckCircleIcon,
    ClockIcon,
    StarIcon,
    AcademicCapIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    BriefcaseIcon,
    TrendingUpIcon,
    CurrencyIcon,
    SparklesIcon,
    XIcon,
    ArrowUpTrayIcon
} from '../icons';
import { useToast } from '../../services/ToastContext';
import { useDrivingSchool } from '../../services/DrivingSchoolContext';
import { AppErrorBoundary } from '../common/AppErrorBoundary';

import type { 
    User, DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment, DSFeeStructure 
} from '../../types';

interface DrivingSchoolManagerProps {
    currentUser: User;
    currentInstitution: any;
    externalTab?: 'dashboard' | 'students' | 'lessons' | 'fleet' | 'instructors' | 'finance' | 'settings';
}

const SmartStudentImporterModal: React.FC<{ onClose: () => void; onImport: (data: any[]) => Promise<void> }> = ({ onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { error: toastError } = useToast();

    const handleImport = async () => {
        if (!file) return;
        setIsProcessing(true);
        try {
            // Simulate parsing excel and mapping fields
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockData = [
                { fullName: "John Doe", email: "john@example.com", phone: "0711223344", licenseTypeInterested: "Class C1" },
                { fullName: "Jane Smith", email: "jane@example.com", phone: "0722334455", licenseTypeInterested: "Class B" }
            ];
            await onImport(mockData);
            onClose();
        } catch (err) {
            console.error("Import failed:", err);
            toastError("Failed to import students. Please check your file format.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-white/20">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Smart Student Importer</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Bulk onboard students from Excel/CSV</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors">
                        <XIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                
                <div className="p-12 text-center">
                    {!file ? (
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-12 hover:border-indigo-500 transition-colors group cursor-pointer">
                            <input 
                                type="file" 
                                accept=".xlsx,.xls,.csv" 
                                className="hidden" 
                                id="excel-upload"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <label htmlFor="excel-upload" className="cursor-pointer">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <ArrowUpTrayIcon className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">Drop your Excel file here</h4>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">or click to browse from computer</p>
                            </label>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-4 text-left">
                                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-2xl">
                                    <SparklesIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">{file.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{(file.size / 1024).toFixed(1)} KB • Ready to map fields</p>
                                </div>
                                <button onClick={() => setFile(null)} className="text-xs font-black text-red-500 uppercase tracking-widest">Change</button>
                            </div>

                            <div className="mt-8 space-y-4">
                                <button 
                                    onClick={handleImport}
                                    disabled={isProcessing}
                                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3"
                                >
                                    {isProcessing ? 'Processing...' : 'Run Smart Importer'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Supported: .xlsx, .csv, .xls</p>
                    <button onClick={onClose} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const DrivingSchoolActionModal: React.FC<{
    type: 'student' | 'instructor' | 'vehicle' | 'lesson' | null;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    students?: any[];
    instructors?: any[];
    vehicles?: DSVehicle[];
}> = ({ type, onClose, onSave, students = [], instructors = [], vehicles = [] }) => {
    const [formData, setFormData] = useState<any>(() => {
        const base = {
            status: type === 'student' ? 'Enrolled' : type === 'instructor' ? 'Active' : type === 'vehicle' ? 'Operational' : 'Scheduled'
        };
        if (type === 'student') return { ...base, enrollmentDate: new Date().toISOString().split('T')[0], theoryProgressPercent: 0, practicalProgressPercent: 0 };
        if (type === 'lesson') return { ...base, lessonDate: new Date().toISOString().split('T')[0], startTime: '08:00', endTime: '09:00', lessonType: 'Practical' };
        if (type === 'vehicle') return { ...base, transmission: 'Manual' };
        if (type === 'instructor') return { ...base, rating: 5 };
        return base;
    });
    const [isSaving, setIsSaving] = useState(false);

    if (!type) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Save failed:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const title = {
        student: 'Enrol New Student',
        instructor: 'Add Instructor',
        vehicle: 'Register Vehicle',
        lesson: 'Schedule Lesson'
    }[type];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{title}</h3>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Driving School Excellence</p>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {type === 'student' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input required type="text" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="07XX XXX XXX" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Category</label>
                                    <select value={formData.licenseTypeInterested || ''} onChange={e => setFormData({...formData, licenseTypeInterested: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Class</option>
                                        <option value="Class A">Class A (Motorcycle)</option>
                                        <option value="Class B">Class B (Light Vehicle)</option>
                                        <option value="Class C1">Class C1 (Truck)</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {type === 'instructor' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructor Name</label>
                                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. David Kimani" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="07XX XXX XXX" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialization</label>
                                    <input type="text" value={formData.specialization || ''} onChange={e => setFormData({...formData, specialization: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Heavy Commercial" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Number</label>
                                    <input type="text" value={formData.licenseNumber || ''} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="DL-XXXXXX" />
                                </div>
                            </>
                        )}

                        {type === 'vehicle' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Make</label>
                                    <input required type="text" value={formData.make || ''} onChange={e => setFormData({...formData, make: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Toyota" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Model</label>
                                    <input required type="text" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Hilux" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plate Number</label>
                                    <input required type="text" value={formData.plateNumber || ''} onChange={e => setFormData({...formData, plateNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="KXY 000X" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transmission</label>
                                    <select value={formData.transmission || 'Manual'} onChange={e => setFormData({...formData, transmission: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="Manual">Manual</option>
                                        <option value="Automatic">Automatic</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {type === 'lesson' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student</label>
                                    <select required value={formData.studentId || ''} onChange={e => setFormData({...formData, studentId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Student</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructor</label>
                                    <select value={formData.instructorId || ''} onChange={e => setFormData({...formData, instructorId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Instructor</option>
                                        {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input required type="date" value={formData.lessonDate || ''} onChange={e => setFormData({...formData, lessonDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle</label>
                                    <select value={formData.vehicleId || ''} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Vehicle</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                                    <input required type="time" value={formData.startTime || '08:00'} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                                    <input required type="time" value={formData.endTime || '09:00'} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Type</label>
                                    <select value={formData.lessonType || 'Practical'} onChange={e => setFormData({...formData, lessonType: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="Practical">Practical (Driving)</option>
                                        <option value="Theory">Theory (Classroom)</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="pt-6 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                        <button type="submit" disabled={isSaving} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const DrivingSchoolManager: React.FC<DrivingSchoolManagerProps> = ({
    currentUser,
    currentInstitution,
    externalTab
}) => {
    const { success, error: toastError } = useToast();
    const {
        instructors, vehicles, students, lessons, mastery, settings, invoices, payments,
        addInstructor: onAddInstructor,
        addVehicle: onAddVehicle,
        addStudent: onAddStudent,
        addLesson: onAddLesson,
        addMastery: onAddMastery,
        updateSettings: onUpdateSettings,
        addInvoice: onAddInvoice,
        addPayment: onAddPayment
    } = useDrivingSchool();
    
    const [internalTab, setInternalTab] = useState<'dashboard' | 'students' | 'lessons' | 'fleet' | 'instructors' | 'finance' | 'settings'>('dashboard');
    const activeTab = externalTab || internalTab;
    const setActiveTab = (tab: any) => setInternalTab(tab);

    const [searchTerm, setSearchTerm] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [actionModal, setActionModal] = useState<{ type: 'student' | 'instructor' | 'vehicle' | 'lesson' | null; data?: any }>({ type: null });

    // Normalization
    const normalizedStudents = useMemo(() => students.map(s => ({
        ...s,
        fullName: s.fullName || (s as any).full_name || (s as any).name || '(No Name)',
    })), [students]);

    const normalizedInstructors = useMemo(() => instructors.map(i => ({
        ...i,
        name: i.name || (i as any).full_name || (i as any).fullName || '(No Name)',
    })), [instructors]);

    const filteredStudents = useMemo(() => 
        normalizedStudents.filter(s => (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [normalizedStudents, searchTerm]);

    const stats = useMemo(() => ({
        totalStudents: students.length,
        activeInstructors: instructors.filter(i => i.status === 'Active').length,
        operationalVehicles: vehicles.filter(v => v.status === 'Operational').length,
        pendingLessons: lessons.filter(l => l.status === 'Scheduled').length,
    }), [students, instructors, vehicles, lessons]);

    return (
        <AppErrorBoundary>
            <div className="space-y-10 animate-fade-in pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-4">
                            Driving <span className="text-indigo-600">School</span>
                            <div className="px-4 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                                <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Enterprise</span>
                            </div>
                        </h1>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 ml-1">Fleet Management & Student Success</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => setActionModal({ type: 'student' })} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
                            <PlusIcon className="w-4 h-4" />
                            Enroll Student
                        </button>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-6 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3">
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            Bulk Import
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Students', value: stats.totalStudents, icon: UsersIcon, color: 'indigo' },
                        { label: 'Active Fleet', value: stats.operationalVehicles, icon: TruckIcon, color: 'emerald' },
                        { label: 'Instructors', value: stats.activeInstructors, icon: AcademicCapIcon, color: 'blue' },
                        { label: 'Scheduled Lessons', value: stats.pendingLessons, icon: CalendarDaysIcon, color: 'amber' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-indigo-500 transition-all">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-4 bg-${stat.color}-50 dark:bg-${stat.color}-900/30 rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Main Navigation - Hidden if controlled externally */}
                {!externalTab && (
                    <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-3xl w-fit">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: ClipboardListIcon },
                            { id: 'students', label: 'Students', icon: UsersIcon },
                            { id: 'lessons', label: 'Lessons', icon: CalendarDaysIcon },
                            { id: 'fleet', label: 'Fleet', icon: TruckIcon },
                            { id: 'instructors', label: 'Instructors', icon: AcademicCapIcon },
                            { id: 'finance', label: 'Finance', icon: CurrencyIcon },
                            { id: 'settings', label: 'Settings', icon: SettingsIcon }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Tab Content */}
                <div className="min-h-[600px]">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Recent Lessons Summary */}
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Upcoming Schedule</h3>
                                        <button onClick={() => setActiveTab('lessons')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All</button>
                                    </div>
                                    <div className="space-y-4">
                                        {lessons.filter(l => l.status === 'Scheduled').slice(0, 5).map(lesson => (
                                            <div key={lesson.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                                                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                                    <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {students.find(s => s.id === lesson.studentId)?.fullName || 'Student'}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        {new Date(lesson.startTime).toLocaleDateString()} at {new Date(lesson.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                    {lesson.lessonType || 'Practical'}
                                                </span>
                                            </div>
                                        ))}
                                        {lessons.filter(l => l.status === 'Scheduled').length === 0 && (
                                            <div className="text-center py-8 text-slate-400 text-sm font-bold">No upcoming lessons scheduled.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions / Shortcuts */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setActionModal({ type: 'student' })} className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-xl shadow-indigo-600/20">
                                        <UsersIcon className="w-8 h-8" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Enroll Student</span>
                                    </button>
                                    <button onClick={() => setActionModal({ type: 'lesson' })} className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[2.5rem] text-white flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-xl">
                                        <CalendarDaysIcon className="w-8 h-8" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Book Lesson</span>
                                    </button>
                                    <button onClick={() => setActionModal({ type: 'vehicle' })} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <TruckIcon className="w-8 h-8 text-slate-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Add Vehicle</span>
                                    </button>
                                    <button onClick={() => setActionModal({ type: 'instructor' })} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <AcademicCapIcon className="w-8 h-8 text-slate-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Hire Instructor</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="relative flex-1 max-w-md">
                                    <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search students..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-16 pr-8 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                            <th className="px-10 py-8">Student</th>
                                            <th className="px-10 py-8">Contact</th>
                                            <th className="px-10 py-8">Category</th>
                                            <th className="px-10 py-8">Status</th>
                                            <th className="px-10 py-8 text-right">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center font-black text-indigo-600">
                                                            {student.fullName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{student.fullName}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ID: {student.id.split('_')[1]}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{student.phone}</p>
                                                    <p className="text-[10px] font-medium text-slate-400 mt-1">{student.email}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className="text-[10px] font-black uppercase px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">{student.licenseTypeInterested || 'Class B'}</span>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${student.status === 'Graduated' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {student.status}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full ml-auto overflow-hidden">
                                                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(student.practicalProgressPercent || 0)}%` }}></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-4xl bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Settings</h2>
                            <div className="space-y-8">
                                <button 
                                    onClick={async () => {
                                        try {
                                            await onUpdateSettings(settings);
                                            success("Settings saved");
                                        } catch (err) {
                                            toastError("Failed to save settings");
                                        }
                                    }}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {actionModal.type && (
                    <DrivingSchoolActionModal 
                        type={actionModal.type}
                        onClose={() => setActionModal({ type: null })}
                        onSave={async (data) => {
                            if (actionModal.type === 'student') await onAddStudent(data);
                            else if (actionModal.type === 'instructor') await onAddInstructor(data);
                            else if (actionModal.type === 'vehicle') await onAddVehicle(data);
                            else if (actionModal.type === 'lesson') await onAddLesson(data);
                        }}
                        students={normalizedStudents}
                        instructors={normalizedInstructors}
                        vehicles={vehicles}
                    />
                )}

                {isImportModalOpen && (
                    <SmartStudentImporterModal 
                        onClose={() => setIsImportModalOpen(false)}
                        onImport={async (data) => {
                            for (const s of data) {
                                await onAddStudent(s);
                            }
                            success(`Successfully imported ${data.length} students`);
                        }}
                    />
                )}
            </div>
        </AppErrorBoundary>
    );
};
