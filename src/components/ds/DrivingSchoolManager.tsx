import React, { useState, useMemo } from 'react';
import { 
    UsersIcon, 
    TruckIcon, 
    CalendarDaysIcon, 
    ClipboardListIcon, 
    SettingsIcon,
    PlusIcon,
    SearchIcon,
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

import type { 
    User, DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment, DSFeeStructure 
} from '../../types';

const SmartStudentImporterModal: React.FC<{ onClose: () => void; onImport: (data: any[]) => Promise<void> }> = ({ onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleImport = async () => {
        if (!file) return;
        setIsProcessing(true);
        // Simulate parsing excel and mapping fields
        setTimeout(async () => {
            const mockData = [
                { fullName: "John Doe", email: "john@example.com", phone: "0711223344", licenseTypeInterested: "Class C1" },
                { fullName: "Jane Smith", email: "jane@example.com", phone: "0722334455", licenseTypeInterested: "Class B" }
            ];
            await onImport(mockData);
            setIsProcessing(false);
            onClose();
        }, 1500);
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
                                <div className="grid grid-cols-2 gap-4 text-left">
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Detected Fields</span>
                                        <span className="text-xs font-bold text-indigo-600">4 Columns Found</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Target Module</span>
                                        <span className="text-xs font-bold text-indigo-600">DS Students</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleImport}
                                    disabled={isProcessing}
                                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            <span>Run Smart Importer</span>
                                        </>
                                    )}
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
    students?: DSStudent[];
    instructors?: DSInstructor[];
    vehicles?: DSVehicle[];
}> = ({ type, onClose, onSave, students = [], instructors = [], vehicles = [] }) => {
    const [formData, setFormData] = useState<any>({
        status: type === 'student' ? 'Enrolled' : type === 'instructor' ? 'Active' : type === 'vehicle' ? 'Operational' : 'Scheduled',
        enrollmentDate: new Date().toISOString().split('T')[0],
        lessonDate: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '09:00',
        lessonType: 'Practical',
        theoryProgressPercent: 0,
        practicalProgressPercent: 0,
        rating: 5,
        transmission: 'Manual'
    });
    const [isSaving, setIsSaving] = useState(false);

    if (!type) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Filter formData to only include fields relevant to the current type
            const filteredData: any = { status: formData.status };
            
            if (type === 'student') {
                const fields = ['fullName', 'email', 'phone', 'licenseTypeInterested', 'theoryProgressPercent', 'practicalProgressPercent', 'enrollmentDate'];
                fields.forEach(f => { if (formData[f] !== undefined) filteredData[f] = formData[f]; });
            } else if (type === 'instructor') {
                const fields = ['name', 'phone', 'licenseNumber', 'rating'];
                fields.forEach(f => { if (formData[f] !== undefined) filteredData[f] = formData[f]; });
            } else if (type === 'vehicle') {
                const fields = ['make', 'model', 'plateNumber', 'transmission'];
                fields.forEach(f => { if (formData[f] !== undefined) filteredData[f] = formData[f]; });
            } else if (type === 'lesson') {
                const fields = ['studentId', 'instructorId', 'vehicleId', 'lessonDate', 'startTime', 'endTime', 'lessonType'];
                fields.forEach(f => { if (formData[f] !== undefined) filteredData[f] = formData[f]; });
            }

            await onSave(filteredData);
            onClose();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save. Please try again.");
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. student@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Category</label>
                                    <select value={formData.licenseTypeInterested || ''} onChange={e => setFormData({...formData, licenseTypeInterested: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Class</option>
                                        <option value="Class A">Class A (Motorcycle)</option>
                                        <option value="Class B">Class B (Light Vehicle)</option>
                                        <option value="Class C1">Class C1 (Truck)</option>
                                        <option value="Class D">Class D (Bus)</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {type === 'instructor' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructor Name</label>
                                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Sarah Williams" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Number</label>
                                    <input type="text" value={formData.licenseNumber || ''} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
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
                                    <input required type="text" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Vitz" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plate Number</label>
                                    <input required type="text" value={formData.plateNumber || ''} onChange={e => setFormData({...formData, plateNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="KXX 000X" />
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle</label>
                                    <select value={formData.vehicleId || ''} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Vehicle</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input required type="date" value={formData.lessonDate || ''} onChange={e => setFormData({...formData, lessonDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                                    <input required type="time" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="pt-6 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                        <button type="submit" disabled={isSaving} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Confirm Registration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface DrivingSchoolManagerProps {
    currentUser: User;
    currentInstitution: any;
    instructors: DSInstructor[];
    vehicles: DSVehicle[];
    students: DSStudent[];
    lessons: DSLesson[];
    mastery: DSSkillMastery[];
    settings: DSSettings | null;
    invoices: DSInvoice[];
    payments: DSPayment[];
    onAddInstructor: (data: any) => Promise<void>;
    onAddVehicle: (data: any) => Promise<void>;
    onAddStudent: (data: any) => Promise<void>;
    onAddLesson: (data: any) => Promise<void>;
    onAddMastery: (data: any) => Promise<void>;
    onUpdateSettings: (data: any) => Promise<void>;
    onAddInvoice: (data: any) => Promise<void>;
    onAddPayment: (data: any) => Promise<void>;
    users: User[];
    onLogAction: (msg: string) => void;
    onImportStudents?: (imported: any[]) => Promise<void>;
    transactions?: any[];
    bankTransactions?: any[];
    onReconcileTransaction?: (txId: string, invId: string) => Promise<void>;
    externalTab?: 'dashboard' | 'students' | 'lessons' | 'fleet' | 'instructors' | 'finance' | 'settings';
}

export const DrivingSchoolManager: React.FC<DrivingSchoolManagerProps> = ({
    instructors,
    vehicles,
    students,
    lessons,
    mastery,
    settings,
    invoices,
    payments,
    onAddInstructor,
    onAddVehicle,
    onAddStudent,
    onAddLesson,
    onAddMastery,
    onUpdateSettings,
    onAddInvoice,
    onAddPayment,
    users,
    onLogAction,
    onImportStudents,
    transactions,
    bankTransactions,
    externalTab
}) => {
    const [internalTab, setInternalTab] = useState<'dashboard' | 'students' | 'lessons' | 'fleet' | 'instructors' | 'finance' | 'settings'>('dashboard');
    const activeTab = externalTab || internalTab;
    const setActiveTab = (tab: any) => setInternalTab(tab);

    const [searchTerm, setSearchTerm] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [actionModal, setActionModal] = useState<{ type: 'student' | 'instructor' | 'vehicle' | 'lesson' | null; data?: any }>({ type: null });
    const [financeSubTab, setFinanceSubTab] = useState<'invoices' | 'payments' | 'bank_feed'>('invoices');
    const [settingsSubTab, setSettingsSubTab] = useState<'policies' | 'curriculum'>('policies');

    // Stats
    const stats = useMemo(() => ({
        totalStudents: students.length,
        activeInstructors: instructors.filter(i => i.status === 'Active').length,
        operationalVehicles: vehicles.filter(v => v.status === 'Operational').length,
        pendingLessons: lessons.filter(l => l.status === 'Scheduled').length,
        completionRate: students.length > 0 
            ? Math.round((students.filter(s => s.status === 'Graduated').length / students.length) * 100) 
            : 0
    }), [students, instructors, vehicles, lessons]);

    // Normalize students to handle both camelCase and snake_case from DB
    const normalizedStudents = useMemo(() => students.map(s => ({
        ...s,
        fullName: s.fullName || (s as any).full_name || '(No Name)',
        phone: s.phone || (s as any).phone_number || '',
        email: s.email || (s as any).email || '',
        licenseTypeInterested: s.licenseTypeInterested || (s as any).license_type_interested || '',
        theoryProgressPercent: s.theoryProgressPercent ?? (s as any).theory_progress_percent ?? 0,
        practicalProgressPercent: s.practicalProgressPercent ?? (s as any).practical_progress_percent ?? 0,
        status: s.status || 'Enrolled',
        enrollmentDate: s.enrollmentDate || (s as any).enrollment_date || '',
    })), [students]);

    const filteredStudents = useMemo(() => 
        normalizedStudents.filter(s => (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [normalizedStudents, searchTerm]);

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-20">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        Driving School <span className="text-indigo-600">Portal</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase text-[10px] tracking-widest">
                        Manage training, logistics, and student progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => {
                            const type = activeTab === 'students' ? 'student' : 
                                       activeTab === 'instructors' ? 'instructor' : 
                                       activeTab === 'fleet' ? 'vehicle' : 
                                       activeTab === 'lessons' ? 'lesson' : 
                                       'student'; // Default to student on dashboard
                            setActionModal({ type });
                        }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Quick Action</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs - Hidden if controlled externally */}
            {!externalTab && (
                <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-3xl w-fit border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: <TrendingUpIcon className="w-4 h-4" /> },
                        { id: 'students', label: 'Students', icon: <UsersIcon className="w-4 h-4" /> },
                        { id: 'lessons', label: 'Schedule', icon: <CalendarDaysIcon className="w-4 h-4" /> },
                        { id: 'fleet', label: 'Fleet', icon: <TruckIcon className="w-4 h-4" /> },
                        { id: 'instructors', label: 'Instructors', icon: <BriefcaseIcon className="w-4 h-4" /> },
                        { id: 'finance', label: 'Finance', icon: <CurrencyIcon className="w-4 h-4" /> },
                        { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl w-fit mb-6">
                            <UsersIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Total Students</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.totalStudents}</span>
                            <span className="text-emerald-500 font-bold text-xs">+{stats.totalStudents > 0 ? 1 : 0} this week</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl w-fit mb-6">
                            <CalendarDaysIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Pending Lessons</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.pendingLessons}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl w-fit mb-6">
                            <TruckIcon className="w-6 h-6 text-amber-600" />
                        </div>
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Fleet Operational</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.operationalVehicles}</span>
                            <span className="text-slate-400 font-medium text-xs">/ {vehicles.length} total</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
                        <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-900/30 rounded-2xl w-fit mb-6">
                            <AcademicCapIcon className="w-6 h-6 text-fuchsia-600" />
                        </div>
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Graduation Rate</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">{stats.completionRate}%</span>
                        </div>
                    </div>

                    {/* Recent Progress Feed */}
                    <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Activity</h2>
                            <button className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest hover:underline">View All Logs</button>
                        </div>
                        <div className="space-y-6">
                            {lessons.slice(0, 4).map(lesson => (
                                <div key={lesson.id} className="flex items-center gap-4 group">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                                        lesson.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                                    }`}>
                                        <ClipboardListIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-slate-900 dark:text-white">
                                                {students.find(s => s.id === lesson.studentId)?.fullName || 'Unknown Student'}
                                            </h4>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{lesson.lessonDate}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 uppercase tracking-tighter">
                                            {lesson.lessonType} Session • {lesson.startTime} - {lesson.endTime}
                                        </p>
                                    </div>
                                    <ChevronRightIcon className="w-5 h-5 text-slate-300 transition-transform group-hover:translate-x-2" />
                                </div>
                            ))}
                            {lessons.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CalendarDaysIcon className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No recent lesson activity</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Chart Placeholder */}
                    <div className="md:col-span-2 bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight mb-2">Fleet Utilization</h2>
                                <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest opacity-80">Track vehicle usage and efficiency</p>
                            </div>
                            <div className="flex items-center gap-6 mt-8">
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black">78%</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Capacity</span>
                                </div>
                                <div className="h-12 w-px bg-white/20"></div>
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black">4.8</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Avg Rating</span>
                                </div>
                            </div>
                        </div>
                        {/* Abstract Background Design */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search Students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActionModal({ type: 'student' })}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Add Student</span>
                            </button>
                            <button 
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200/50 dark:border-slate-700/50"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>Smart Import</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                    <th className="px-8 py-6">Student</th>
                                    <th className="px-8 py-6">Training Type</th>
                                    <th className="px-8 py-6">Theory Progress</th>
                                    <th className="px-8 py-6">Practical Progress</th>
                                    <th className="px-8 py-6">Status</th>
                                    <th className="px-8 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                    {student.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{student.fullName}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black">{student.phone || 'No Phone'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight italic bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                                {student.licenseTypeInterested || 'Class B'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500">
                                                    <span>Theory</span>
                                                    <span>{student.theoryProgressPercent}%</span>
                                                </div>
                                                <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${student.theoryProgressPercent}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter text-slate-500">
                                                    <span>Practical</span>
                                                    <span>{student.practicalProgressPercent}%</span>
                                                </div>
                                                <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${student.practicalProgressPercent}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                student.status === 'Enrolled' ? 'bg-indigo-50 text-indigo-600' :
                                                student.status === 'Graduated' ? 'bg-emerald-50 text-emerald-600' :
                                                'bg-slate-50 text-slate-600'
                                            }`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronRightIcon className="w-6 h-6" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && (
                            <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="w-24 h-24 bg-white dark:bg-slate-700 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
                                    <UsersIcon className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">No Students Found</h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Add your first student to begin training tracking</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Other tabs placeholders - would be similarly detailed */}
            {activeTab === 'lessons' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Weekly Schedule</h2>
                            <div className="flex gap-2">
                                <button className="p-3 bg-slate-50 rounded-2xl text-slate-400"><CalendarDaysIcon className="w-5 h-5" /></button>
                                <button 
                                    onClick={() => setActionModal({ type: 'lesson' })}
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-2xl font-bold text-xs"
                                >
                                    New Lesson
                                </button>
                            </div>
                        </div>
                        {/* Weekly Grid Placeholder */}
                        <div className="grid grid-cols-7 gap-4">
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                                <div key={day} className="text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">{day}</span>
                                    <div className="h-64 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-start p-2 gap-2 overflow-y-auto no-scrollbar">
                                        {/* Mock Lessons for visual */}
                                        {day === 'MON' && (
                                            <div className="w-full p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded-xl text-left">
                                                <p className="text-[10px] font-black text-indigo-700 uppercase">09:00 AM</p>
                                                <p className="text-[9px] font-bold text-indigo-500 truncate uppercase mt-1">Manual Drill</p>
                                            </div>
                                        )}
                                        {day === 'WED' && (
                                            <div className="w-full p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-left">
                                                <p className="text-[10px] font-black text-emerald-700 uppercase">11:30 AM</p>
                                                <p className="text-[9px] font-bold text-emerald-500 truncate uppercase mt-1">Highway Pr.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <ClockIcon className="w-12 h-12 text-slate-800" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Upcoming <span className="text-indigo-400">Next</span></h2>
                        <div className="space-y-6 relative z-10">
                            {lessons.filter(l => l.status === 'Scheduled').length === 0 ? (
                                <div className="py-12 text-center opacity-50">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No lessons approaching</p>
                                </div>
                            ) : (
                                lessons.filter(l => l.status === 'Scheduled').map(lesson => (
                                    <div key={lesson.id} className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-3 py-1 bg-indigo-500 text-[10px] font-black uppercase rounded-lg">Today</span>
                                            <span className="text-xs font-medium text-slate-400 italic">{lesson.startTime}</span>
                                        </div>
                                        <h4 className="font-bold text-lg mb-1">{students.find(s => s.id === lesson.studentId)?.fullName}</h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{lesson.lessonType} • {vehicles.find(v => v.id === lesson.vehicleId)?.plateNumber}</p>
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-3 bg-white text-slate-900 rounded-xl font-bold text-[10px] uppercase">Complete</button>
                                            <button className="p-3 bg-slate-800 rounded-xl text-slate-400"><EyeIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'fleet' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {vehicles.map(vehicle => (
                        <div key={vehicle.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500">
                            <div className="h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                                <TruckIcon className="w-20 h-20 text-slate-300 transition-transform group-hover:scale-110" />
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <span className="px-4 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                                        {vehicle.transmission}
                                    </span>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                                        vehicle.status === 'Operational' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                    }`}>
                                        {vehicle.status}
                                    </span>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{vehicle.make} {vehicle.model}</h3>
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase">{vehicle.plateNumber}</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Next Service</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white italic">{vehicle.nextServiceDate || 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Total Lessons</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">42</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-8">
                                    <button className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Schedule Maintenance</button>
                                    <button className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">< EyeIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => setActionModal({ type: 'vehicle' })}
                        className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-12 group hover:border-indigo-500 transition-all min-h-[400px]"
                    >
                        <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <PlusIcon className="w-10 h-10 text-slate-300 group-hover:text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-tight">Add New Vehicle</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Expand your training fleet</p>
                    </button>
                </div>
            )}

            {activeTab === 'instructors' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    {instructors.map(instructor => (
                        <div key={instructor.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex gap-8 group">
                            <div className="w-32 h-32 rounded-[2rem] bg-indigo-50/50 flex items-center justify-center relative shrink-0 overflow-hidden">
                                <UsersIcon className="w-16 h-16 text-indigo-200" />
                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent"></div>
                                <div className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{instructor.name}</h3>
                                            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{instructor.specialization || 'Manual Specialist'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-lg">
                                            <StarIcon className="w-3 h-3 text-amber-500 fill-amber-500" />
                                            <span className="text-[10px] font-black text-amber-700">{instructor.rating || '5.0'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 mt-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Lessons</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white">12</span>
                                        </div>
                                        <div className="h-10 w-px bg-slate-100 dark:bg-slate-800"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white">4y+</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-[10px] uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all">Profile</button>
                                    <button className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-[10px] uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all">Schedule</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => setActionModal({ type: 'instructor' })}
                        className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-2 border-dashed border-slate-100 flex items-center justify-center gap-6 group hover:border-indigo-500 transition-all min-h-[160px]"
                    >
                        <PlusIcon className="w-8 h-8 text-slate-300 group-hover:text-indigo-600" />
                        <div className="text-left">
                            <h3 className="text-xl font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-tight leading-none mb-1">Onboard Instructor</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add a new professional driver</p>
                        </div>
                    </button>
                </div>
                {/* Sticky Add Button always visible at bottom */}
                <div className="flex justify-end mt-4">
                    <button
                        onClick={() => setActionModal({ type: 'instructor' })}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>Add Instructor</span>
                    </button>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Finance Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Total Invoiced</h3>
                            <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                KSH {(invoices || []).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Total Paid</h3>
                            <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                                KSH {(invoices || []).reduce((sum, inv) => sum + (inv.paidAmount || 0), 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mb-1">Outstanding Balance</h3>
                            <p className="text-4xl font-black text-red-600 tracking-tighter">
                                KSH {(invoices || []).reduce((sum, inv) => sum + (inv.balance || 0), 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Finance Sub-tabs */}
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl w-fit border border-slate-100 dark:border-slate-800">
                        {[
                            { id: 'invoices', label: 'Invoices', count: (invoices || []).length },
                            { id: 'payments', label: 'Payment Receipts', count: (payments || []).length },
                            { id: 'bank_feed', label: 'Bank & MPESA Feeds', count: (bankTransactions || []).length + (transactions || []).length }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFinanceSubTab(tab.id as any)}
                                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    financeSubTab === tab.id 
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] ${financeSubTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {financeSubTab === 'invoices' && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Invoices</h2>
                                <button 
                                    onClick={() => {
                                        const studentId = prompt("Enter Student ID or Name:");
                                        if (!studentId) return;
                                        const classFee = settings?.feeStructures?.[0];
                                        if (!classFee) {
                                            alert("Please define at least one fee structure in Settings first.");
                                            return;
                                        }
                                        onAddInvoice({
                                            studentId,
                                            studentName: studentId,
                                            className: classFee.className,
                                            items: classFee.items,
                                            totalAmount: classFee.totalAmount,
                                            paidAmount: 0,
                                            balance: classFee.totalAmount,
                                            status: 'Pending',
                                            invoiceNumber: `INV-DS-${Math.floor(Math.random()*10000)}`,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString()
                                        });
                                    }}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 shadow-lg shadow-indigo-600/20"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>Generate Invoice</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                            <th className="px-8 py-6">Invoice #</th>
                                            <th className="px-8 py-6">Student</th>
                                            <th className="px-8 py-6">Class</th>
                                            <th className="px-8 py-6">Total</th>
                                            <th className="px-8 py-6">Balance</th>
                                            <th className="px-8 py-6">Status</th>
                                            <th className="px-8 py-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {(invoices || []).map(inv => (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-6 font-bold text-indigo-600">{inv.invoiceNumber}</td>
                                                <td className="px-8 py-6 text-slate-900 dark:text-white font-medium">{inv.studentName}</td>
                                                <td className="px-8 py-6 text-slate-500 uppercase text-xs font-bold italic">{inv.className}</td>
                                                <td className="px-8 py-6 font-black">KSH {(inv.totalAmount || 0).toLocaleString()}</td>
                                                <td className="px-8 py-6 font-black text-red-500">KSH {(inv.balance || 0).toLocaleString()}</td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                        inv.status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600' :
                                                        inv.status === 'Partially Paid' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-red-50 text-red-600'
                                                    }`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><EyeIcon className="w-6 h-6" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(invoices || []).length === 0 && (
                                    <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-800/50">
                                        <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
                                            <CurrencyIcon className="w-10 h-10 text-slate-200" />
                                        </div>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">No invoices generated yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {financeSubTab === 'payments' && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Payment Receipts</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">History of all student payments received</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                            <th className="px-8 py-6">Date</th>
                                            <th className="px-8 py-6">Receipt #</th>
                                            <th className="px-8 py-6">Student</th>
                                            <th className="px-8 py-6">Method</th>
                                            <th className="px-8 py-6">Amount</th>
                                            <th className="px-8 py-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {(payments || []).map(payment => (
                                            <tr key={payment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-8 py-6 text-xs font-bold">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                                <td className="px-8 py-6 text-xs font-black text-indigo-600">#{payment.receiptNumber}</td>
                                                <td className="px-8 py-6 font-bold text-xs">{payment.studentName}</td>
                                                <td className="px-8 py-6">
                                                    <span className="text-[9px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">{payment.paymentMethod}</span>
                                                </td>
                                                <td className="px-8 py-6 font-black text-sm text-emerald-600">KSH {payment.amount.toLocaleString()}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Download Receipt</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {financeSubTab === 'bank_feed' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">MPESA Transactions</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time mobile money feed</p>
                                    </div>
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
                                        <TrendingUpIcon className="w-5 h-5 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                                    {(transactions || []).map((tx: any) => (
                                        <div key={tx.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-black text-indigo-600">{tx.transactionId}</span>
                                                <span className="text-sm font-black text-slate-900 dark:text-white">KSH {tx.amount.toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">{tx.senderName || tx.phoneNumber}</p>
                                            <div className="flex items-center justify-between mt-4">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(tx.timestamp).toLocaleString()}</span>
                                                <button className="px-4 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all">Reconcile</button>
                                            </div>
                                        </div>
                                    ))}
                                    {(transactions || []).length === 0 && (
                                        <div className="text-center py-12">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No mobile transactions detected</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Bank Statements</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Imported bank transaction feed</p>
                                    </div>
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
                                        <BriefcaseIcon className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                                    {(bankTransactions || []).map((tx: any) => (
                                        <div key={tx.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-black text-blue-600">{tx.reference || 'BANK-TX'}</span>
                                                <span className="text-sm font-black text-slate-900 dark:text-white">KSH {tx.amount.toLocaleString()}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">{tx.description}</p>
                                            <div className="flex items-center justify-between mt-4">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">{tx.date}</span>
                                                <button className="px-4 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all">Link to Student</button>
                                            </div>
                                        </div>
                                    ))}
                                    {(bankTransactions || []).length === 0 && (
                                        <div className="text-center py-12">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No bank transactions found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-4xl bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Platform <span className="text-indigo-600">Settings</span></h2>
                            <p className="text-slate-500 font-medium uppercase text-[10px] tracking-widest">Configure pricing, policies and curriculum</p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
                            <button onClick={() => setSettingsSubTab('policies')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settingsSubTab === 'policies' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Policies & Finance</button>
                            <button onClick={() => setSettingsSubTab('curriculum')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settingsSubTab === 'curriculum' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Curriculum & Automation</button>
                        </div>
                    </div>

                    {settingsSubTab === 'policies' && (
                        <div className="animate-fade-in">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-3">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                                    Operating Policies
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancellation Policy</label>
                                        <textarea 
                                            value={settings?.cancellationPolicy || ''}
                                            onChange={(e) => onUpdateSettings({ ...settings, cancellationPolicy: e.target.value })}
                                            rows={4}
                                            placeholder="Specify your rules for lesson cancellation..."
                                            className="p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fee Structures Section */}
                        <div className="md:col-span-2 pt-12 mt-12 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Fee Structures</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Define costs for different driving classes</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        const className = prompt("Enter Class Name (e.g. CLASS C1):", "CLASS C1");
                                        if (!className) return;
                                        const tuition = Number(prompt("Tuition Fee Amount:", "15000"));
                                        const pdl = Number(prompt("PDL Fee Amount:", "1500"));
                                        const assessment = Number(prompt("Assessment Fee Amount:", "2000"));
                                        
                                        const newFee: DSFeeStructure = {
                                            id: `fee_${Math.random().toString(36).substr(2, 9)}`,
                                            institutionId: settings?.institutionId || '',
                                            className: className,
                                            items: [
                                                { name: 'Tuition Fee', amount: tuition },
                                                { name: 'PDL', amount: pdl },
                                                { name: 'Assessment', amount: assessment }
                                            ],
                                            totalAmount: tuition + pdl + assessment,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString()
                                        };
                                        
                                        const updatedSettings = { 
                                            ...settings, 
                                            feeStructures: [...(settings?.feeStructures || []), newFee] 
                                        };
                                        
                                        onUpdateSettings(updatedSettings).then(() => {
                                            onLogAction(`Added fee structure: ${className}`);
                                        }).catch(err => {
                                            console.error("Failed to save fee structure:", err);
                                            alert("Error saving fee structure. Please try again.");
                                        });
                                    }}
                                    className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Add Class Fee</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(settings?.feeStructures || []).map((fee) => (
                                    <div key={fee.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">{fee.className}</span>
                                            <span className="text-lg font-black text-slate-900 dark:text-white">KSH {fee.totalAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {fee.items.map((item, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500 font-medium">{item.name}</span>
                                                    <span className="text-slate-700 dark:text-slate-300 font-bold">KSH {item.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => {
                                                onUpdateSettings({
                                                    ...settings,
                                                    feeStructures: settings?.feeStructures?.filter(f => f.id !== fee.id)
                                                });
                                            }}
                                            className="mt-4 text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                        >
                                            Remove Structure
                                        </button>
                                    </div>
                                ))}
                                {(settings?.feeStructures || []).length === 0 && (
                                    <div className="md:col-span-2 py-12 text-center bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No fee structures defined yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-8 border-t border-slate-50 dark:border-slate-800">
                            <button 
                                onClick={async () => { 
                                    try {
                                        await onUpdateSettings(settings);
                                        onLogAction("Updated DS Settings"); 
                                        alert("Configuration saved successfully."); 
                                    } catch (err) {
                                        console.error("Failed to save settings:", err);
                                        alert("Failed to save configuration.");
                                    }
                                }}
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.98]"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                    </div>
                    )}

                    {settingsSubTab === 'curriculum' && (
                        <div className="animate-fade-in space-y-12">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Curriculum Management</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-sm font-black text-indigo-600 uppercase mb-4">Theory Lessons</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Sessions</label>
                                                <input type="number" defaultValue={15} className="w-full mt-2 p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration (Hours)</label>
                                                <input type="number" defaultValue={1} className="w-full mt-2 p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-sm font-black text-indigo-600 uppercase mb-4">Practical Lessons</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Sessions</label>
                                                <input type="number" defaultValue={20} className="w-full mt-2 p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration (Hours)</label>
                                                <input type="number" step="0.5" defaultValue={1.5} className="w-full mt-2 p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 transition-all text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none">Save Curriculum</button>
                                </div>
                            </div>

                            <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Automated Scheduling (Suggestion)</h3>
                                <p className="text-xs text-slate-500 mb-6 leading-relaxed">Transition from manual booking to an intelligent auto-scheduling system to reduce administrative workload.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-bl-3xl">
                                            <CalendarDaysIcon className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2 mt-4">Template Batching</h4>
                                        <p className="text-xs text-slate-500">Upon enrollment, generate a 4-week schedule automatically based on the student's preferred time slots (e.g., Daily 8AM-9AM).</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-bl-3xl">
                                            <SparklesIcon className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2 mt-4">Smart Match Engine</h4>
                                        <p className="text-xs text-slate-500">A background worker algorithm that allocates unassigned students to available instructors and vehicles nightly, optimizing for location and transmission type.</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-bl-3xl">
                                            <UsersIcon className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2 mt-4">Student Self-Service</h4>
                                        <p className="text-xs text-slate-500">Provide students with a booking portal link where they can pick available slots directly, enforcing prerequisite rules (e.g., finish Theory before Practical).</p>
                                    </div>
                                </div>
                                <div className="mt-8 flex gap-4">
                                    <button className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">View Technical Implementation Plan</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
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
                    students={students}
                    instructors={instructors}
                    vehicles={vehicles}
                />
            )}

            {isImportModalOpen && (
                <SmartStudentImporterModal 
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={async (data) => {
                        await onImportStudents?.(data);
                        setIsImportModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};
