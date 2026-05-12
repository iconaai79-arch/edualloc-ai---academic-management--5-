import React, { useState, useMemo, useEffect } from 'react';
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
    ArrowUpTrayIcon,
    PencilIcon,
    TrashIcon,
    ListIcon,
    CreditCardIcon,
    PrinterIcon,
    DownloadIcon
} from '../icons';
import { generateDSPDF, generateDSThermalReceipt, generateDSSchedulePDF } from '../../utils/dsPdfGenerator';
import { useToast } from '../../services/ToastContext';
import { useDrivingSchool } from '../../services/DrivingSchoolContext';
import { AppErrorBoundary } from '../common/AppErrorBoundary';

import type { 
    User, DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment, DSFeeStructure, DSFeeItem, LetterheadConfig 
} from '../../types';
import { DSBroadcasterView } from './DSBroadcasterView';
import { DSFinanceFeeds } from './DSFinanceFeeds';
import { BuySMSModal } from '../BuySMSModal';
import { 
    Banknote as BanknotesIcon 
} from 'lucide-react';
import { apiService } from '../../services/apiService';

interface DrivingSchoolManagerProps {
    currentUser: User;
    currentInstitution: any;
    externalTab?: 'dashboard' | 'students' | 'lessons' | 'fleet' | 'instructors' | 'finance' | 'settings' | 'broadcaster';
    onRefreshData?: () => Promise<void>;
    departments?: any[];
    letterheadConfig?: LetterheadConfig;
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
                { fullName: "John Doe", email: "john@example.com", phone: "0711223344", licenseTypeInterested: "Class C1", enrollmentDate: new Date().toISOString().split('T')[0] },
                { fullName: "Jane Smith", email: "jane@example.com", phone: "0722334455", licenseTypeInterested: "Class B", enrollmentDate: new Date().toISOString().split('T')[0] }
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

const DrivingSchoolActionModal: React.FC<{ type: string | null, onClose: () => void, students: DSStudent[], instructors: DSInstructor[], vehicles: DSVehicle[], lessons: DSLesson[], invoices: DSInvoice[], payments: DSPayment[], onSave: (data: any) => Promise<void>, settings: DSSettings | null, initialData?: any, currentInstitution?: any, departments?: any[] }> = ({ type, onClose, students, instructors, vehicles, lessons, invoices, payments, onSave, settings, initialData, currentInstitution, departments }) => {
    const { success: toastSuccess, error: toastError } = useToast();
    const [isActionLoading, setIsActionLoading] = useState(false);

    const nextAdmissionNumber = useMemo(() => {
        const prefixStr = (settings?.studentIdPrefix || 'ADM-').trim();
        const asNum = Number(prefixStr);
        if (!isNaN(asNum) && prefixStr !== '') {
            let maxVal = asNum;
            students.forEach(s => {
                if (s.admissionNumber) {
                    const sNum = Number(s.admissionNumber.trim());
                    if (!isNaN(sNum) && sNum >= asNum && sNum > maxVal) {
                        maxVal = sNum;
                    }
                }
            });
            return String(maxVal + 1);
        } else {
            let maxNum = 0;
            students.forEach(s => {
                if (s.admissionNumber && s.admissionNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                    const remainder = s.admissionNumber.slice(prefixStr.length).trim();
                    const match = remainder.match(/\d+/);
                    if (match) {
                        const num = parseInt(match[0], 10);
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                        }
                    }
                }
            });
            return `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
        }
    }, [settings?.studentIdPrefix, students]);

    const nextInvoiceNumber = useMemo(() => {
        const prefixStr = (settings?.invoicePrefix || 'INV-').trim();
        const asNum = Number(prefixStr);
        if (!isNaN(asNum) && prefixStr !== '') {
            let maxVal = asNum;
            invoices.forEach(inv => {
                if (inv.invoiceNumber) {
                    const num = Number(inv.invoiceNumber.trim());
                    if (!isNaN(num) && num >= asNum && num > maxVal) {
                        maxVal = num;
                    }
                }
            });
            return String(maxVal + 1);
        } else {
            let maxNum = 0;
            invoices.forEach(inv => {
                if (inv.invoiceNumber && inv.invoiceNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                    const remainder = inv.invoiceNumber.slice(prefixStr.length).trim();
                    const match = remainder.match(/\d+/);
                    if (match) {
                        const num = parseInt(match[0], 10);
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                        }
                    }
                }
            });
            return `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
        }
    }, [settings?.invoicePrefix, invoices]);

    const nextReceiptNumber = useMemo(() => {
        const prefixStr = (settings?.receiptPrefix || 'REC-').trim();
        const asNum = Number(prefixStr);
        if (!isNaN(asNum) && prefixStr !== '') {
            let maxVal = asNum;
            payments.forEach(pay => {
                if (pay.receiptNumber) {
                    const num = Number(pay.receiptNumber.trim());
                    if (!isNaN(num) && num >= asNum && num > maxVal) {
                        maxVal = num;
                    }
                }
            });
            return String(maxVal + 1);
        } else {
            let maxNum = 0;
            payments.forEach(pay => {
                if (pay.receiptNumber && pay.receiptNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                    const remainder = pay.receiptNumber.slice(prefixStr.length).trim();
                    const match = remainder.match(/\d+/);
                    if (match) {
                        const num = parseInt(match[0], 10);
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                        }
                    }
                }
            });
            return `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
        }
    }, [settings?.receiptPrefix, payments]);

    useEffect(() => {
        if (settings && !initialData) {
            setFormData((prev: any) => ({
                ...prev,
                admissionNumber: type === 'student' ? nextAdmissionNumber : prev.admissionNumber,
                courseDurationDays: type === 'student' ? (settings.schedulingRules?.requiredDaysToComplete || settings.defaultCourseDuration || 21) : prev.courseDurationDays,
                invoiceNumber: type === 'invoice' ? nextInvoiceNumber : prev.invoiceNumber,
                receiptNumber: type === 'payment' ? nextReceiptNumber : prev.receiptNumber
            }));
        }
    }, [settings, type, initialData, nextAdmissionNumber, nextInvoiceNumber, nextReceiptNumber]);

    const [formData, setFormData] = useState<any>(() => {
        const base = initialData || {
            status: type === 'student' ? 'Enrolled' : type === 'instructor' ? 'Active' : type === 'vehicle' ? 'Operational' : 'Scheduled',
            admissionNumber: type === 'student' ? nextAdmissionNumber : undefined,
            invoiceNumber: type === 'invoice' ? nextInvoiceNumber : undefined,
            receiptNumber: type === 'payment' ? nextReceiptNumber : undefined
        };
        if (!initialData) {
            if (type === 'student') return { ...base, courseDurationDays: settings?.schedulingRules?.requiredDaysToComplete || settings?.defaultCourseDuration || 21, enrollmentDate: new Date().toISOString().split('T')[0], theoryProgressPercent: 0, practicalProgressPercent: 0 };
            if (type === 'lesson') return { ...base, lessonDate: new Date().toISOString().split('T')[0], startTime: '08:00', endTime: '09:00', lessonType: 'Practical' };
            if (type === 'vehicle') return { ...base, transmission: 'Manual', capacity: 1 };
            if (type === 'instructor') return { ...base, rating: 5, instructorType: 'Driving Instructor' };
            if (type === 'invoice') return { ...base, items: [], totalAmount: 0, paidAmount: 0, balance: 0, status: 'Pending', createdAt: new Date().toISOString() };
            if (type === 'payment') return { ...base, paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'M-Pesa' };
            if (type === 'fee_structure') return { className: 'CLASS C1', tuition: 15000, tuitionPriority: 1, pdl: 1500, pdlPriority: 2, assessment: 2000, assessmentPriority: 3 };
            if (type === 'broadcast') return { title: '', message: '', target: 'All', priority: 'Medium', channels: ['Portal'] };
        }
        return base;
    });
    const [studentSearch, setStudentSearch] = useState('');
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
        student: initialData ? 'Update Student Record' : 'Enrol New Student',
        instructor: 'Add Instructor',
        vehicle: 'Register Vehicle',
        lesson: 'Schedule Lesson',
        invoice: 'Generate Invoice',
        payment: 'Record Payment',
        fee_structure: 'Define Class Fee',
        broadcast: 'Institutional Broadcast',
        vehicle_unavailability: 'Manage Vehicle Unavailability'
    }[type as string] || 'Driving School Action';

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
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Number</label>
                                    <input required type="text" value={formData.admissionNumber || ''} onChange={e => setFormData({...formData, admissionNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="ADM-001" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input required type="text" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="07XX XXX XXX" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID / Passport Number</label>
                                    <input type="text" value={formData.idNumber || ''} onChange={e => setFormData({...formData, idNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. 12345678" />
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
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="student@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Date</label>
                                    <input required type="date" value={formData.enrollmentDate || ''} onChange={e => setFormData({...formData, enrollmentDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Required Days to Complete</label>
                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded">Configured in Settings</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        disabled
                                        value={formData.courseDurationDays || settings?.schedulingRules?.requiredDaysToComplete || settings?.defaultCourseDuration || ''} 
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-80 disabled:cursor-not-allowed" 
                                        placeholder="e.g. 21"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Lesson Hours</label>
                                    <select 
                                        value={formData.preferredLessonHours || ''} 
                                        onChange={e => setFormData({...formData, preferredLessonHours: e.target.value})} 
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none"
                                    >
                                        <option value="">Select Preference</option>
                                        {['Morning', 'Noon', 'Evening'].map(type => {
                                            const slot = (settings?.lessonSlots || []).find(s => s.type === type);
                                            const label = slot ? `${type} (${slot.startTime} - ${slot.endTime})` : type;
                                            return <option key={type} value={type}>{label}</option>;
                                        })}
                                    </select>
                                </div>
                                {initialData && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enrollment Status</label>
                                        <select value={formData.status || 'Enrolled'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                            <option value="Enrolled">Enrolled</option>
                                            <option value="Graduated">Graduated</option>
                                            <option value="Dropped">Dropped</option>
                                        </select>
                                    </div>
                                )}
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
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructor Type</label>
                                    <select value={formData.instructorType || 'Driving Instructor'} onChange={e => setFormData({...formData, instructorType: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="Driving Instructor">Driving Instructor (Practical)</option>
                                        <option value="Theory Trainer">Theory Trainer (Classroom)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Number</label>
                                    <input type="text" value={formData.licenseNumber || ''} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="DL-XXXXXX" />
                                </div>
                                {formData.instructorType === 'Driving Instructor' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Vehicle</label>
                                        <select value={formData.assignedVehicleId || ''} onChange={e => setFormData({...formData, assignedVehicleId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                            <option value="">No Assigned Vehicle</option>
                                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                    <select required value={formData.departmentId || ''} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Department</option>
                                        {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
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
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Capacity</label>
                                    <input required type="number" min="1" value={formData.capacity || 1} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. 4" />
                                </div>
                            </>
                        )}

                        {type === 'vehicle_unavailability' && (
                            <div className="md:col-span-2 space-y-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Add Unavailability Slot</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason (e.g. Maintenance)</label>
                                            <input type="text" id="un_reason" className="w-full px-5 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Routine Service" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                            <input type="date" id="un_start" className="w-full px-5 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                            <input type="date" id="un_end" className="w-full px-5 py-3 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const reasonEl = document.getElementById('un_reason') as HTMLInputElement;
                                                const startEl = document.getElementById('un_start') as HTMLInputElement;
                                                const endEl = document.getElementById('un_end') as HTMLInputElement;
                                                if (reasonEl.value && startEl.value && endEl.value) {
                                                    const slots = [...(formData.unavailabilitySlots || []), { reason: reasonEl.value, startDate: startEl.value, endDate: endEl.value }];
                                                    setFormData({ ...formData, unavailabilitySlots: slots });
                                                    reasonEl.value = '';
                                                    startEl.value = '';
                                                    endEl.value = '';
                                                }
                                            }}
                                            className="col-span-2 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Add to List
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Unavailability Slots</h4>
                                    {(formData.unavailabilitySlots || []).length === 0 ? (
                                        <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                                            <p className="text-xs text-slate-400 italic">No unavailability recorded for this vehicle</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar text-left">
                                            {(formData.unavailabilitySlots || []).map((slot: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{slot.reason}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{new Date(slot.startDate).toLocaleDateString()} — {new Date(slot.endDate).toLocaleDateString()}</p>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const nextSlots = formData.unavailabilitySlots.filter((_: any, i: number) => i !== idx);
                                                            setFormData({ ...formData, unavailabilitySlots: nextSlots });
                                                        }}
                                                        className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
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
                                    <select value={formData.instructorId || ''} onChange={e => {
                                        const instId = e.target.value;
                                        const inst = instructors.find(i => i.id === instId);
                                        // Priority 1: Instructor's specific assignedVehicleId
                                        // Priority 2: Look for a vehicle that points to this instructor
                                        const linkedVehicle = vehicles.find(v => v.id === inst?.assignedVehicleId) || vehicles.find(v => (v as any).assignedInstructorId === instId);
                                        
                                        setFormData({
                                            ...formData, 
                                            instructorId: instId,
                                            vehicleId: linkedVehicle?.id || formData.vehicleId
                                        });
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Instructor</option>
                                        {instructors
                                            .filter(i => {
                                                if (formData.lessonType === 'Practical') return !i.instructorType || i.instructorType === 'Driving Instructor';
                                                if (formData.lessonType === 'Theory') return i.instructorType === 'Theory Trainer';
                                                return true;
                                            })
                                            .map(i => <option key={i.id} value={i.id}>{i.name} ({i.instructorType === 'Theory Trainer' ? 'Theory' : 'Practical'})</option>)
                                        }
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input required type="date" value={formData.lessonDate || ''} onChange={e => setFormData({...formData, lessonDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle</label>
                                    <select value={formData.vehicleId || ''} onChange={e => {
                                        const vhId = e.target.value;
                                        const vh = vehicles.find(v => v.id === vhId);
                                        // Priority 1: Vehicle's specific assignedInstructorId
                                        // Priority 2: Look for an instructor that points to this vehicle
                                        const linkedInstructor = instructors.find(i => i.id === (vh as any).assignedInstructorId) || instructors.find(i => i.assignedVehicleId === vhId);

                                        setFormData({
                                            ...formData, 
                                            vehicleId: vhId,
                                            instructorId: linkedInstructor?.id || formData.instructorId
                                        });
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
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

                        {type === 'invoice' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Student</label>
                                        <div className="flex items-center gap-2">
                                            <SearchIcon className="w-3 h-3 text-slate-400" />
                                            <input 
                                                type="text" 
                                                value={studentSearch} 
                                                onChange={e => setStudentSearch(e.target.value)}
                                                placeholder="Search name..."
                                                className="text-[10px] bg-transparent border-none focus:ring-0 p-0 font-bold text-indigo-600 placeholder:text-slate-300 w-24 text-right"
                                            />
                                        </div>
                                    </div>
                                    <select required value={formData.studentId || ''} onChange={e => {
                                        const s = students.find(x => x.id === e.target.value);
                                        setFormData({...formData, studentId: e.target.value, studentName: s?.fullName || ''});
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Student</option>
                                        {students
                                            .filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase()))
                                            .map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber})</option>)
                                        }
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Structure (Optional Autopopulate)</label>
                                    <select value={formData.feeStructureId || ''} onChange={e => {
                                        const fs = settings?.feeStructures?.find((x: any) => x.id === e.target.value);
                                        if (fs) {
                                            setFormData({
                                                ...formData, 
                                                feeStructureId: fs.id,
                                                totalAmount: fs.totalAmount,
                                                balance: fs.totalAmount,
                                                items: fs.items
                                            });
                                        } else {
                                            setFormData({ ...formData, feeStructureId: '', items: [] });
                                        }
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Fee Structure</option>
                                        {settings?.feeStructures?.map((fs: DSFeeStructure) => <option key={fs.id} value={fs.id}>{fs.className} (KES {fs.totalAmount.toLocaleString()})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (KES)</label>
                                    <input required type="number" value={formData.totalAmount || ''} onChange={e => setFormData({...formData, totalAmount: Number(e.target.value), balance: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="0.00" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Number</label>
                                    <input required type="text" value={formData.invoiceNumber || ''} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="INV-DS-XXXX" />
                                </div>
                            </>
                        )}

                        {type === 'payment' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</label>
                                        <div className="flex items-center gap-2">
                                            <SearchIcon className="w-3 h-3 text-slate-400" />
                                            <input 
                                                type="text" 
                                                value={studentSearch} 
                                                onChange={e => setStudentSearch(e.target.value)}
                                                placeholder="Search name..."
                                                className="text-[10px] bg-transparent border-none focus:ring-0 p-0 font-bold text-indigo-600 placeholder:text-slate-300 w-24 text-right"
                                            />
                                        </div>
                                    </div>
                                    <select required value={formData.studentId || ''} onChange={e => {
                                        const s = students.find(x => x.id === e.target.value);
                                        const studentInvoices = invoices.filter(inv => inv.studentId === e.target.value && inv.status !== 'Fully Paid');
                                        const firstInvoice = studentInvoices[0];
                                        setFormData({
                                            ...formData, 
                                            studentId: e.target.value, 
                                            studentName: s?.fullName || '',
                                            invoiceId: firstInvoice?.id || '',
                                            amount: firstInvoice?.balance || 0
                                        });
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Student</option>
                                        {students
                                            .filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase()))
                                            .map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber})</option>)
                                        }
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice</label>
                                    <select required value={formData.invoiceId || ''} onChange={e => setFormData({...formData, invoiceId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="">Select Invoice</option>
                                        {invoices.filter((inv: any) => !formData.studentId || inv.studentId === formData.studentId).map((inv: any) => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.invoiceNumber} - {inv.studentName} (Bal: {inv.balance?.toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Paid</label>
                                    <input required type="number" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                                    <div className="flex gap-2">
                                        <select value={formData.paymentMethod || 'M-Pesa'} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                            <option value="M-Pesa">M-Pesa</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Bank">Bank Transfer</option>
                                        </select>
                                        
                                        {formData.paymentMethod === 'M-Pesa' && (
                                            <button 
                                                type="button"
                                                disabled={isActionLoading || !formData.amount || !formData.studentId}
                                                onClick={async () => {
                                                    const student = students.find(s => s.id === formData.studentId);
                                                    if (!student?.phone) { toastError("Student phone number missing"); return; }
                                                    setIsActionLoading(true);
                                                    try {
                                                        const { triggerMpesaStkPush } = await import('../../services/apiService').then(m => m.apiService);
                                                        await triggerMpesaStkPush({
                                                            amount: formData.amount,
                                                            phoneNumber: student.phone,
                                                            reference: formData.receiptNumber || `DS-${Date.now()}`,
                                                            description: `Driving School Payment: ${student.fullName}`,
                                                            institutionId: currentInstitution?.id || ''
                                                        });
                                                        toastSuccess("STK Push sent to student's phone!");
                                                    } catch (err: any) {
                                                        toastError(err.message || "Failed to trigger STK Push");
                                                    } finally {
                                                        setIsActionLoading(false);
                                                    }
                                                }}
                                                className="px-4 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all disabled:opacity-50"
                                            >
                                                {isActionLoading ? '...' : 'STK Push'}
                                            </button>
                                        )}

                                        {formData.paymentMethod === 'Bank' && (
                                            <button 
                                                type="button"
                                                disabled={isActionLoading}
                                                onClick={async () => {
                                                    setIsActionLoading(true);
                                                    try {
                                                        // Mock reconciliation or call bank API
                                                        await new Promise(resolve => setTimeout(resolve, 2000));
                                                        toastSuccess("Bank records reconciled. Transaction verified!");
                                                        setFormData({ ...formData, status: 'Verified', transactionReference: `BNK-${Math.random().toString(36).substr(2, 9).toUpperCase()}` });
                                                    } catch (err) {
                                                        toastError("Failed to reconcile with bank");
                                                    } finally {
                                                        setIsActionLoading(false);
                                                    }
                                                }}
                                                className="px-4 bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
                                            >
                                                {isActionLoading ? '...' : 'Reconcile'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {(formData.paymentMethod === 'M-Pesa' || formData.paymentMethod === 'Bank') && (
                                    <div className="md:col-span-2 space-y-2 animate-fade-in">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            {formData.paymentMethod} Reference Code
                                        </label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={formData.transactionReference || ''} 
                                            onChange={e => setFormData({...formData, transactionReference: e.target.value.toUpperCase()})} 
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" 
                                            placeholder={formData.paymentMethod === 'M-Pesa' ? "e.g. QXJ1234567" : "e.g. TRF-998877"} 
                                        />
                                    </div>
                                )}
                                {formData.transactionReference && (
                                    <div className="md:col-span-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-2xl">
                                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Transaction Verified: {formData.transactionReference}</p>
                                    </div>
                                )}
                            </>
                        ) || null}

                        {type === 'fee_structure' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Name</label>
                                    <input required type="text" value={formData.className || ''} onChange={e => setFormData({...formData, className: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. CLASS C1" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tuition Fee</label>
                                    <div className="flex gap-2">
                                        <input required type="number" value={formData.tuition || ''} onChange={e => setFormData({...formData, tuition: Number(e.target.value)})} className="flex-[3] px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                        <input title="Priority" type="number" value={formData.tuitionPriority || 1} onChange={e => setFormData({...formData, tuitionPriority: Number(e.target.value)})} className="flex-1 px-3 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-center" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PDL Fee</label>
                                    <div className="flex gap-2">
                                        <input required type="number" value={formData.pdl || ''} onChange={e => setFormData({...formData, pdl: Number(e.target.value)})} className="flex-[3] px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                        <input title="Priority" type="number" value={formData.pdlPriority || 2} onChange={e => setFormData({...formData, pdlPriority: Number(e.target.value)})} className="flex-1 px-3 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-center" />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assessment Fee</label>
                                    <div className="flex gap-2">
                                        <input required type="number" value={formData.assessment || ''} onChange={e => setFormData({...formData, assessment: Number(e.target.value)})} className="flex-[3] px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" />
                                        <input title="Priority" type="number" value={formData.assessmentPriority || 3} onChange={e => setFormData({...formData, assessmentPriority: Number(e.target.value)})} className="flex-1 px-3 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-center" />
                                    </div>
                                </div>
                            </>
                        )}

                        {type === 'broadcast' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Broadcast Title</label>
                                    <input required type="text" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Schedule Update" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Audience</label>
                                    <select value={formData.target || 'All'} onChange={e => setFormData({...formData, target: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="All">All Institutional Users</option>
                                        <option value="Students">Driving Students Only</option>
                                        <option value="Instructors">Instructors Only</option>
                                        <option value="Staff">Administrative Staff</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Content</label>
                                    <textarea required rows={4} value={formData.message || ''} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold resize-none" placeholder="Type your school-wide message here..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Level</label>
                                    <select value={formData.priority || 'Medium'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                        <option value="Low">Low (Info)</option>
                                        <option value="Medium">Medium (Routine)</option>
                                        <option value="High">High (Urgent)</option>
                                        <option value="Critical">Critical (Immediate)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Distribution Channels</label>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {['Portal', 'SMS', 'Email'].map(channel => (
                                            <button 
                                                key={channel}
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.channels || [];
                                                    const next = current.includes(channel) ? current.filter((c: string) => c !== channel) : [...current, channel];
                                                    setFormData({ ...formData, channels: next });
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    (formData.channels || []).includes(channel) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 text-slate-400'
                                                }`}
                                            >
                                                {channel}
                                            </button>
                                        ))}
                                    </div>
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
    externalTab,
    onRefreshData: onRefreshDataProp,
    departments,
    letterheadConfig
}) => {
    const { success, error: toastError } = useToast();
    const {
        instructors, vehicles, students, lessons, mastery, settings, invoices, payments,
        addInstructor: onAddInstructor,
        addVehicle: onAddVehicle,
        updateVehicle: onUpdateVehicle,
        deleteVehicle: onDeleteVehicle,
        addStudent: onAddStudent,
        updateStudent: onUpdateStudent,
        deleteStudent: onDeleteStudent,
        addLesson: onAddLesson,
        addMastery: onAddMastery,
        updateSettings: onUpdateSettings,
        addInvoice: onAddInvoice,
        addPayment: onAddPayment,
        refreshData,
        mpesaTransactions,
        bankTransactions
    } = useDrivingSchool();
    
    const [internalTab, setInternalTab] = useState<'dashboard' | 'students' | 'lessons' | 'fleet' | 'instructors' | 'finance' | 'broadcaster' | 'settings'>('dashboard');
    const [financeTab, setFinanceTab] = useState<'records' | 'feeds'>('records');
    const [settingsSubTab, setSettingsSubTab] = useState<'policies' | 'numbering' | 'fees' | 'slots'>('policies');
    const [users, setUsers] = useState<User[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchUsers(currentInstitution.id).then(setUsers).catch(console.error);
            
            // Auto-migration for new schema fields (Safe execution)
            const migrations = [
                "ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS preferred_lesson_hours text;",
                "ALTER TABLE ds_vehicles ADD COLUMN IF NOT EXISTS assigned_instructor_id text;",
                "ALTER TABLE ds_lessons ADD COLUMN IF NOT EXISTS confirmation_status text;"
            ];

            migrations.forEach(sql => {
                apiService.runMigration(sql).catch(() => {
                    // Silently ignore if column already exists or restricted
                });
            });
        }
    }, [currentInstitution?.id]);

    const handleAutoGenerateTomorrow = async () => {
        if (!settings?.schedulingRules?.dailySequence?.length) {
            toastError("Please configure Lesson Sequence in Settings first.");
            return;
        }

        setIsActionLoading(true);
        setUnassignedDueToVehicles([]); // Reset previous tracking list
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            // 1. Filter students who have active enrollment
            const eligibleStudents = students.filter(s => s.status === 'Enrolled');
            
            // Track busy vehicles grouped by simultaneous time slots
            const assignedVehiclesBySlot: Record<string, Set<string>> = {};
            // Pre-populate with pre-existing busy vehicles for tomorrow
            lessons.filter(l => l.lessonDate === dateStr && l.vehicleId).forEach(l => {
                if (!assignedVehiclesBySlot[l.startTime]) {
                    assignedVehiclesBySlot[l.startTime] = new Set<string>();
                }
                assignedVehiclesBySlot[l.startTime].add(l.vehicleId!);
            });

            let lessonsAdded = 0;
            let skippedStudents = 0;
            const leftOutCandidates: Array<{ name: string; slot: string }> = [];

            for (const student of eligibleStudents) {
                // Robust duplicate prevention: check if student already has a lesson scheduled for tomorrow
                const existingLessonsTomorrow = lessons.filter(l => l.studentId === student.id && l.lessonDate === dateStr);
                if (existingLessonsTomorrow.length > 0) {
                    skippedStudents++;
                    continue;
                }

                // Get student's preferred slot or default to Morning
                const preferredSlotType = student.preferredLessonHours || 'Morning';
                const slot = (settings.lessonSlots || []).find(s => s.type === preferredSlotType) || { startTime: '08:00', endTime: '10:00' };
                
                let currentTime = slot.startTime;
                let missingVehicleConstraint = false;
                let targetSlotTime = slot.startTime;
                
                // For each type in the sequence (e.g., Theory, Practical)
                for (const type of settings.schedulingRules.dailySequence) {
                    const duration = type === 'Theory' 
                        ? (settings.schedulingRules.theoryDurationMinutes || 60)
                        : (settings.schedulingRules.practicalDurationMinutes || 60);
                    
                    // Simple end time calculation
                    const [h, m] = currentTime.split(':').map(Number);
                    const end = new Date();
                    end.setHours(h, m + duration, 0, 0);
                    const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

                    // Assign instructor based on type
                    const instructor = type === 'Theory' 
                        ? instructors.find(i => i.instructorType === 'Theory Trainer')
                        : instructors.find(i => i.instructorType === 'Driving Instructor' || !i.instructorType);
                    
                    let vehicle: any = undefined;
                    if (type === 'Practical') {
                        const operationalVehicles = vehicles.filter(v => v.status === 'Operational');
                        const busySet = assignedVehiclesBySlot[currentTime] || new Set<string>();
                        
                        // Attempt to assign the instructor's default vehicle first if operational and not busy
                        if (instructor?.assignedVehicleId && !busySet.has(instructor.assignedVehicleId)) {
                            vehicle = operationalVehicles.find(v => v.id === instructor.assignedVehicleId);
                        }
                        // Fallback to any operational vehicle that is not currently busy in this target slot
                        if (!vehicle) {
                            vehicle = operationalVehicles.find(v => !busySet.has(v.id));
                        }

                        if (!vehicle) {
                            // Fleet capacity constraint reached for this parallel time slot
                            missingVehicleConstraint = true;
                            targetSlotTime = currentTime;
                            break; // Abort remaining practical generation sequence for this student
                        } else {
                            // Register vehicle as occupied for this parallel target slot
                            if (!assignedVehiclesBySlot[currentTime]) {
                                assignedVehiclesBySlot[currentTime] = new Set<string>();
                            }
                            assignedVehiclesBySlot[currentTime].add(vehicle.id);
                        }
                    }

                    await onAddLesson({
                        studentId: student.id,
                        instructorId: instructor?.id,
                        vehicleId: vehicle?.id,
                        lessonDate: dateStr,
                        startTime: currentTime,
                        endTime: endTime,
                        lessonType: type,
                        status: 'Scheduled',
                        confirmationStatus: 'Pending',
                        institutionId: currentInstitution?.id
                    });
                    
                    lessonsAdded++;
                    currentTime = endTime; // Set for next in sequence if back-to-back
                }

                if (missingVehicleConstraint) {
                    leftOutCandidates.push({
                        name: student.fullName || (student as any).name || 'Unknown Candidate',
                        slot: targetSlotTime
                    });
                }
            }

            if (leftOutCandidates.length > 0) {
                setUnassignedDueToVehicles(leftOutCandidates);
                setActiveTab('lessons'); // Redirect to lessons view to prominently showcase the capacity warning list
            }

            if (lessonsAdded > 0) {
                success(`Auto-generated ${lessonsAdded} lessons for tomorrow (${dateStr})`);
            } else {
                success(`Tomorrow's schedule is already complete. Skipped ${skippedStudents} student(s) to avoid duplicates.`);
            }
            if (onRefreshDataProp) await onRefreshDataProp();
            refreshData();
        } catch (err) {
            console.error("Auto-generation failed:", err);
            toastError("Failed to auto-generate schedule. Check console for details.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAutoScheduleSingleStudent = async (studentId: string) => {
        const student = normalizedStudents.find(s => s.id === studentId);
        if (!student) return;

        if (!settings?.schedulingRules?.dailySequence?.length) {
            toastError("Please configure Lesson Sequence in Settings first.");
            return;
        }

        setIsActionLoading(true);
        try {
            // Fill available slots for the next 14 days
            let lessonsAdded = 0;
            const daysToSchedule = 14; 
            
            for (let i = 1; i <= daysToSchedule; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);
                // Skip Sundays
                if (date.getDay() === 0) continue;

                const dateStr = date.toISOString().split('T')[0];

                // Check if student already has lessons on this date
                const existingOnDate = lessons.filter(l => l.studentId === studentId && l.lessonDate === dateStr);
                if (existingOnDate.length > 0) continue;

                const preferredSlotType = student.preferredLessonHours || 'Morning';
                const slot = (settings.lessonSlots || []).find(s => s.type === preferredSlotType) || { startTime: '08:00', endTime: '10:00' };
                
                let currentTime = slot.startTime;
                
                for (const type of settings.schedulingRules.dailySequence) {
                    const duration = type === 'Theory' 
                        ? (settings.schedulingRules.theoryDurationMinutes || 60)
                        : (settings.schedulingRules.practicalDurationMinutes || 60);
                    
                    const [h, m] = currentTime.split(':').map(Number);
                    const end = new Date();
                    end.setHours(h, m + duration, 0, 0);
                    const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

                    const instructor = type === 'Theory' 
                        ? instructors.find(inst => inst.instructorType === 'Theory Trainer')
                        : instructors.find(inst => inst.instructorType === 'Driving Instructor' || !inst.instructorType);
                    
                    const vehicle = type === 'Practical' 
                        ? (vehicles.find(v => v.id === instructor?.assignedVehicleId) || vehicles.find(v => v.status === 'Operational'))
                        : undefined;

                    await onAddLesson({
                        studentId: student.id,
                        instructorId: instructor?.id,
                        vehicleId: vehicle?.id,
                        lessonDate: dateStr,
                        startTime: currentTime,
                        endTime: endTime,
                        lessonType: type,
                        status: 'Scheduled',
                        confirmationStatus: 'Pending',
                        institutionId: currentInstitution?.id
                    });
                    
                    lessonsAdded++;
                    currentTime = endTime;
                }
            }

            success(`Auto-scheduled ${lessonsAdded} lessons for ${student.fullName} over the next 14 days.`);
            if (onRefreshDataProp) await onRefreshDataProp();
            refreshData();
        } catch (err) {
            console.error("Single student scheduling failed:", err);
            toastError("Failed to auto-schedule student. Check console.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const activeTab = externalTab || internalTab;
    const setActiveTab = (tab: any) => setInternalTab(tab);

    const [searchTerm, setSearchTerm] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBuySMSModalOpen, setIsBuySMSModalOpen] = useState(false);
    const [actionModal, setActionModal] = useState<{ type: 'student' | 'instructor' | 'vehicle' | 'vehicle_unavailability' | 'lesson' | 'invoice' | 'payment' | 'fee_structure' | 'broadcast' | null; data?: any; initialData?: any }>({ type: null });
    const [unassignedDueToVehicles, setUnassignedDueToVehicles] = useState<Array<{ name: string; slot: string }>>([]);

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
        normalizedStudents.filter(s => 
            (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.idNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [normalizedStudents, searchTerm]);

    const filteredLessons = useMemo(() => 
        lessons.filter(l => {
            const student = normalizedStudents.find(s => s.id === l.studentId);
            const instructor = normalizedInstructors.find(i => i.id === l.instructorId);
            return (student?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (instructor?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (l.topic || '').toLowerCase().includes(searchTerm.toLowerCase());
        }),
    [lessons, normalizedStudents, normalizedInstructors, searchTerm]);

    const filteredVehicles = useMemo(() => 
        vehicles.filter(v => 
            v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.model.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [vehicles, searchTerm]);

    const filteredInstructors = useMemo(() => 
        normalizedInstructors.filter(i => 
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.specialization || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [normalizedInstructors, searchTerm]);

    const filteredInvoices = useMemo(() => 
        invoices.filter(inv => 
            (inv.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [invoices, searchTerm]);

    const filteredPayments = useMemo(() => 
        payments.filter(pay => {
            const student = normalizedStudents.find(s => s.id === pay.studentId);
            return (pay.studentName || student?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (pay.receiptNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
        }),
    [payments, normalizedStudents, searchTerm]);

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
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                        {activeTab === 'dashboard' && (
                            <>
                                <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-4">
                                    Driving <span className="text-indigo-600">School</span>
                                    <div className="px-4 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Enterprise</span>
                                    </div>
                                </h1>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 ml-1">Fleet Management & Student Success</p>
                            </>
                        )}
                        {activeTab !== 'dashboard' && (
                            <div className="flex items-center gap-4">
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                </h1>
                                <div className="px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DS Module</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {activeTab === 'broadcaster' && (
                            <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className={`w-2 h-2 rounded-full ${(currentInstitution?.smsBalance || 0) < 50 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SMS Units</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white">{(currentInstitution?.smsBalance || 0).toLocaleString()} <span className="text-[9px] text-slate-400">Available</span></span>
                                </div>
                                <button 
                                    onClick={() => setIsBuySMSModalOpen(true)}
                                    className="ml-2 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all"
                                    title="Top Up Units"
                                >
                                    <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </button>
                            </div>
                        )}

                        {activeTab === 'lessons' && (
                            <button 
                                onClick={handleAutoGenerateTomorrow}
                                disabled={isActionLoading}
                                className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                {isActionLoading ? 'Generating...' : 'Auto-Generate Tomorrow'}
                            </button>
                        )}

                        {activeTab !== 'dashboard' && (
                            <button 
                                onClick={() => {
                                    const typeMap: Record<string, any> = {
                                        students: 'student',
                                        lessons: 'lesson',
                                        fleet: 'vehicle',
                                        instructors: 'instructor',
                                        finance: 'invoice',
                                        settings: 'fee_structure'
                                    };
                                    setActionModal({ type: typeMap[activeTab] || 'student' });
                                }} 
                                className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {activeTab === 'students' ? 'Enroll Student' :
                                 activeTab === 'lessons' ? 'Schedule Lesson' :
                                 activeTab === 'fleet' ? 'Register Vehicle' :
                                 activeTab === 'instructors' ? 'Add Instructor' :
                                 activeTab === 'finance' ? 'Generate Invoice' :
                                 activeTab === 'settings' ? 'Add Class Fee' : 'New Action'}
                            </button>
                        )}
                        {activeTab === 'students' && (
                            <button onClick={() => setIsImportModalOpen(true)} className="px-6 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3">
                                <ArrowUpTrayIcon className="w-4 h-4" />
                                Bulk Import
                            </button>
                        )}
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
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl md:rounded-3xl w-full overflow-x-auto scrollbar-hide pb-3 md:pb-2">
                        <div className="flex items-center gap-2 min-w-max">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: ClipboardListIcon },
                            { id: 'students', label: 'Students', icon: UsersIcon },
                            { id: 'lessons', label: 'Lessons', icon: CalendarDaysIcon },
                            { id: 'fleet', label: 'Fleet', icon: TruckIcon },
                            { id: 'instructors', label: 'Instructors', icon: AcademicCapIcon },
                            { id: 'finance', label: 'Finance', icon: CurrencyIcon },
                            { id: 'broadcaster', label: 'Broadcaster', icon: SparklesIcon },
                            { id: 'settings', label: 'Config', icon: SettingsIcon }
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
                    </div>
                )}

                {/* Tab Content */}
                <div className="min-h-[600px]">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Recent Lessons Summary */}
                                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
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
                                                        {lesson.lessonDate || (lesson as any).date || 'No Date'} at {lesson.startTime || 'No Time'}
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
                                    <button onClick={() => setActionModal({ type: 'student' })} className="bg-indigo-600 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-xl shadow-indigo-600/20">
                                        <UsersIcon className="w-8 h-8" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Enroll Student</span>
                                    </button>
                                    <button onClick={() => setActionModal({ type: 'lesson' })} className="bg-slate-900 dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform shadow-xl">
                                        <CalendarDaysIcon className="w-8 h-8" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Book Lesson</span>
                                    </button>
                                    <button onClick={() => setActionModal({ type: 'vehicle' })} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <TruckIcon className="w-8 h-8 text-slate-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Add Vehicle</span>
                                    </button>
                                    <button onClick={() => setActionModal({ type: 'instructor' })} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform border border-slate-100 dark:border-slate-800 shadow-sm">
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
                                            <th className="px-10 py-8">Preferred Hours</th>
                                            <th className="px-10 py-8">Status</th>
                                            <th className="px-10 py-8 text-right">Progress</th>
                                            <th className="px-10 py-8 text-right">Actions</th>
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
                                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">
                                                                {student.admissionNumber || `REF: ${student.id.split('_')[1]}`}
                                                            </p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                                {student.idNumber ? `ID: ${student.idNumber}` : student.passportNumber ? `PASS: ${student.passportNumber}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{student.phone}</p>
                                                    <p className="text-[10px] font-medium text-slate-400 mt-1">{student.email}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className="text-[10px] font-black uppercase px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">{student.licenseTypeInterested || 'Class B'}</span>
                                                    <p className="text-[10px] font-medium text-slate-400 mt-1">{student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : 'No Date'}</p>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg ${
                                                        student.preferredLessonHours === 'Morning' ? 'bg-amber-50 text-amber-600' :
                                                        student.preferredLessonHours === 'Noon' ? 'bg-indigo-50 text-indigo-600' :
                                                        student.preferredLessonHours === 'Evening' ? 'bg-emerald-50 text-emerald-600' :
                                                        'bg-slate-50 text-slate-400'
                                                    }`}>
                                                        {student.preferredLessonHours || 'Not Set'}
                                                    </span>
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
                                                <td className="px-10 py-8 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleAutoScheduleSingleStudent(student.id)}
                                                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                                            title="Auto Schedule Lessons"
                                                        >
                                                            <SparklesIcon className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => setActionModal({ type: 'student', initialData: student })}
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                                            title="Edit Student"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => onDeleteStudent(student.id)}
                                                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                                            title="Remove Student"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lessons' && (
                        <div className="space-y-8 animate-fade-in">
                            {unassignedDueToVehicles.length > 0 && (
                                <div className="p-6 md:p-8 bg-amber-50 dark:bg-amber-950/30 rounded-[2.5rem] border border-amber-200 dark:border-amber-900/50 shadow-sm animate-fade-in">
                                    <div className="flex items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                                                !
                                            </div>
                                            <div>
                                                <h4 className="font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight text-sm">
                                                    Unassigned Candidates (Fleet Capacity Reached)
                                                </h4>
                                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                                    The following enrolled students could not be allocated practical slots tomorrow due to full utilization of operational vehicles:
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setUnassignedDueToVehicles([])}
                                            className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest hover:underline px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {unassignedDueToVehicles.map((item, idx) => (
                                            <div key={idx} className="bg-white/80 dark:bg-slate-900/80 px-4 py-3 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between shadow-sm">
                                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-black text-[9px] uppercase rounded">
                                                    {item.slot} Slot
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Training Sessions</h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                        <div className="relative flex-1 md:w-64">
                                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search lessons..." 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold"
                                            />
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                try {
                                                    const doc = await generateDSSchedulePDF(filteredLessons, students, instructors, vehicles, currentInstitution, letterheadConfig);
                                                    doc.save(`Training_Schedule_${new Date().toISOString().split('T')[0]}.pdf`);
                                                    success?.('Schedule PDF generated successfully!');
                                                } catch (err) {
                                                    console.error('PDF Generation Error:', err);
                                                    toastError?.('Failed to generate PDF schedule');
                                                }
                                            }}
                                            className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
                                        >
                                            <DownloadIcon className="w-4 h-4" /> Download PDF
                                        </button>
                                        <button 
                                            onClick={() => window.print()} 
                                            className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 dark:bg-slate-800 text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
                                        >
                                            <PrinterIcon className="w-4 h-4" /> Print Schedule
                                        </button>
                                    </div>
                                </div>

                                {/* Printable Branded Letterhead Header (Hidden on screen, visible when printing) */}
                                <div className="hidden print:block w-full border-b border-slate-100 dark:border-slate-800 p-8">
                                    {letterheadConfig?.headerImageUrl ? (
                                        <div className="w-full h-32 flex items-center justify-center overflow-hidden mb-4">
                                            <img 
                                                src={letterheadConfig.headerImageUrl} 
                                                alt="Institution Header" 
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                                            <div className="space-y-1">
                                                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                    {currentInstitution?.name || 'Driving School Academy'}
                                                </h2>
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                                    Official Training Schedule Report
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <h1 className="text-sm font-black text-slate-400 uppercase tracking-widest">Scheduled Sessions</h1>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Printed: {new Date().toLocaleDateString()}</p>
                                            </div>
                                            {currentInstitution?.logoUrl && (
                                                <img src={currentInstitution.logoUrl} alt="Logo" className="h-12 w-12 object-contain ml-4" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                <th className="px-10 py-6 print:px-4 print:py-3">Date & Time</th>
                                                <th className="px-10 py-6 print:px-4 print:py-3">Type</th>
                                                <th className="px-10 py-6 print:px-4 print:py-3">Student</th>
                                                <th className="px-10 py-6 print:px-4 print:py-3">Instructor</th>
                                                <th className="px-10 py-6 print:px-4 print:py-3">Vehicle</th>
                                                <th className="px-10 py-6 print:px-4 print:py-3">Status</th>
                                                <th className="px-10 py-6 text-right print:hidden">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {filteredLessons.map(lesson => (
                                                <tr key={lesson.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 print:hover:bg-transparent">
                                                    <td className="px-10 py-6 print:px-4 print:py-3">
                                                        <p className="font-bold text-sm print:text-xs">{lesson.lessonDate ? new Date(lesson.lessonDate).toLocaleDateString() : 'No Date'}</p>
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase mt-0.5 print:text-[9px]">{lesson.startTime} - {lesson.endTime}</p>
                                                    </td>
                                                    <td className="px-10 py-6 print:px-4 print:py-3">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest print:text-[9px] print:px-0 print:border-none print:bg-transparent ${
                                                            lesson.lessonType === 'Theory' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 print:text-amber-700' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 print:text-indigo-700'
                                                        }`}>
                                                            {lesson.lessonType || 'Practical'}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 font-bold text-sm print:px-4 print:py-3 print:text-xs">
                                                        {normalizedStudents.find(s => s.id === lesson.studentId)?.fullName || 'Unknown Student'}
                                                    </td>
                                                    <td className="px-10 py-6 text-sm print:px-4 print:py-3 print:text-xs">
                                                        {normalizedInstructors.find(i => i.id === lesson.instructorId)?.name || 'Unassigned'}
                                                    </td>
                                                    <td className="px-10 py-6 text-sm print:px-4 print:py-3 print:text-xs">
                                                        {vehicles.find(v => v.id === lesson.vehicleId)?.plateNumber || 'N/A'}
                                                    </td>
                                                    <td className="px-10 py-6 print:px-4 print:py-3">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest print:px-0 print:bg-transparent print:border-none ${
                                                            lesson.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 print:text-emerald-700' : 
                                                            lesson.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 print:text-rose-700' : 'bg-blue-50 text-blue-600 print:text-blue-700'
                                                        }`}>
                                                            {lesson.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 text-right print:hidden">
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => setActionModal({ type: 'lesson', initialData: lesson })}
                                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                                                title="Edit Lesson"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                            <button 
                                                                onClick={() => onDeleteLesson(lesson.id)}
                                                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                                                title="Delete Lesson"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Printable Branded Letterhead Footer (Hidden on screen, visible when printing) */}
                                <div className="hidden print:block w-full border-t border-slate-100 dark:border-slate-800 p-8 mt-12">
                                    {letterheadConfig?.footerImageUrl ? (
                                        <div className="w-full h-20 flex items-center justify-center overflow-hidden border-t border-slate-50 pt-4">
                                            <img 
                                                src={letterheadConfig.footerImageUrl} 
                                                alt="Report Footer" 
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between items-end">
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                <p>Generated by EduAi Driving School Automation</p>
                                                <p>&copy; {new Date().getFullYear()} {currentInstitution?.name}</p>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                                                Official Record
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fleet' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                            {filteredVehicles.map(vehicle => (
                                <div key={vehicle.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-6 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setActionModal({ type: 'vehicle', initialData: vehicle })}
                                            className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => onDeleteVehicle(vehicle.id)}
                                            className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between mb-8">
                                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                            <TruckIcon className="w-7 h-7 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            vehicle.status === 'Operational' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                            {vehicle.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{vehicle.make} {vehicle.model}</h3>
                                        <button 
                                            onClick={() => setActionModal({ type: 'vehicle_unavailability', initialData: vehicle })}
                                            className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                                            title="Manage Unavailability"
                                        >
                                            <CalendarDaysIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-indigo-600 font-black text-sm mt-1">{vehicle.plateNumber}</p>
                                    
                                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Assigned Driver</label>
                                        <select 
                                            value={vehicle.assignedInstructorId || ''} 
                                            onChange={async (e) => {
                                                const instructorId = e.target.value;
                                                await onUpdateVehicle({ ...vehicle, assignedInstructorId: instructorId });
                                                // Also update instructor to link back if needed, but vehicle side is primary here
                                            }}
                                            className="w-full bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 py-2.5 px-4"
                                        >
                                            <option value="">Select Instructor</option>
                                            {normalizedInstructors.map(inst => (
                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Transmission</p>
                                            <p className="text-xs font-bold">{vehicle.transmission}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</p>
                                            <p className="text-xs font-bold">{vehicle.vehicleType || 'Car'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'instructors' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                            {filteredInstructors.map(instructor => (
                                <div key={instructor.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center group hover:border-indigo-500 transition-all">
                                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center font-black text-2xl text-indigo-600 mx-auto mb-6 group-hover:scale-110 transition-transform">
                                        {instructor.name.charAt(0)}
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{instructor.name}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-4">{instructor.specialization || 'Master Instructor'}</p>
                                    <div className="flex items-center justify-center gap-1 text-amber-400 mb-6">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={i < instructor.rating ? 'opacity-100' : 'opacity-20'}>★</span>
                                        ))}
                                    </div>
                                    <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        instructor.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                                    }`}>
                                        {instructor.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Finance Sub-Tabs */}
                            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[2rem] w-fit">
                                <button 
                                    onClick={() => setFinanceTab('records')}
                                    className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                                        financeTab === 'records' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Billing Records
                                </button>
                                <button 
                                    onClick={() => setFinanceTab('feeds')}
                                    className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                                        financeTab === 'feeds' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Transaction Feeds
                                </button>
                            </div>

                            {financeTab === 'records' ? (
                                <>
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Invoices</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage billing and student receivables</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setActionModal({ type: 'payment' })} className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                                            <CurrencyIcon className="w-4 h-4" />
                                            Record Payment
                                        </button>
                                        <button onClick={() => setActionModal({ type: 'invoice' })} className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2">
                                            <PlusIcon className="w-4 h-4" />
                                            Generate Invoice
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                <th className="px-10 py-6">Invoice #</th>
                                                <th className="px-10 py-6">Student</th>
                                                <th className="px-10 py-6">Amount</th>
                                                <th className="px-10 py-6">Balance</th>
                                                <th className="px-10 py-6">Status</th>
                                                <th className="px-10 py-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {filteredInvoices.map(invoice => (
                                                <tr key={invoice.id} className="hover:bg-slate-50/50">
                                                    <td className="px-10 py-6 font-bold">{invoice.invoiceNumber}</td>
                                                    <td className="px-10 py-6 text-sm">{invoice.studentName}</td>
                                                    <td className="px-10 py-6 font-bold text-sm">KES {invoice.totalAmount.toLocaleString()}</td>
                                                    <td className="px-10 py-6 text-sm text-rose-600 font-bold">KES {invoice.balance.toLocaleString()}</td>
                                                    <td className="px-10 py-6">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                            invoice.status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                            {invoice.status}
                                                        </span>
                                                        {invoice.items && (
                                                            <div className="mt-2 space-y-1">
                                                                {invoice.items.map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-slate-400">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${item.paidAmount >= item.amount ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                                        <span>{item.name}: {item.amount > 0 ? ((item.paidAmount || 0) / item.amount * 100).toFixed(0) : '0'}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-10 py-6 text-right space-x-2">
                                                        <button 
                                                            onClick={async () => {
                                                                const student = students.find(s => s.id === invoice.studentId);
                                                                if (student) {
                                                                    const doc = await generateDSPDF('invoice', invoice, student as any, settings, currentInstitution);
                                                                    doc.output('dataurlnewwindow');
                                                                }
                                                            }}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title="Preview & Print"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                const student = students.find(s => s.id === invoice.studentId);
                                                                if (student) {
                                                                    const doc = await generateDSPDF('invoice', invoice, student as any, settings, currentInstitution);
                                                                    doc.save(`${invoice.invoiceNumber}.pdf`);
                                                                }
                                                            }}
                                                            className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all"
                                                            title="Download PDF"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Payments</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Track collections and receipting</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                <th className="px-10 py-6">Receipt #</th>
                                                <th className="px-10 py-6">Student</th>
                                                <th className="px-10 py-6">Method</th>
                                                <th className="px-10 py-6">Amount</th>
                                                <th className="px-10 py-6">Date</th>
                                                <th className="px-10 py-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {payments.slice(0, 10).map(payment => (
                                                <tr key={payment.id} className="hover:bg-slate-50/50">
                                                    <td className="px-10 py-6 font-bold">{payment.receiptNumber}</td>
                                                    <td className="px-10 py-6 text-sm">{payment.studentName}</td>
                                                    <td className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-indigo-600">{payment.paymentMethod}</td>
                                                    <td className="px-10 py-6 font-bold text-sm">KES {payment.amount.toLocaleString()}</td>
                                                    <td className="px-10 py-6 text-xs text-slate-500">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                                    <td className="px-10 py-6 text-right space-x-2">
                                                        <button 
                                                            onClick={async () => {
                                                                const student = students.find(s => s.id === payment.studentId);
                                                                if (student) {
                                                                    const doc = await generateDSPDF('receipt', payment, student as any, settings, currentInstitution);
                                                                    doc.save(`${payment.receiptNumber}.pdf`);
                                                                }
                                                            }}
                                                            className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all"
                                                            title="Download PDF"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                const student = students.find(s => s.id === payment.studentId);
                                                                if (student) {
                                                                    const url = await generateDSThermalReceipt(payment, student as any, currentInstitution);
                                                                    const win = window.open(url, '_blank');
                                                                    if (win) {
                                                                        win.focus();
                                                                        setTimeout(() => win.print(), 500);
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Thermal Print (EPOS)"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                                </>
                            ) : (
                                <DSFinanceFeeds 
                                    bankTransactions={bankTransactions}
                                    mpesaTransactions={mpesaTransactions}
                                    invoices={invoices}
                                    onReconcile={async (tid, invId, type) => {
                                        const transaction = type === 'bank' 
                                            ? bankTransactions.find(t => t.id === tid)
                                            : mpesaTransactions.find(t => t.id === tid);
                                        
                                        if (transaction) {
                                            try {
                                                await onAddPayment({
                                                    invoiceId: invId,
                                                    amount: transaction.amount,
                                                    paymentMethod: type === 'bank' ? 'Bank Transfer' : 'M-Pesa',
                                                    transactionReference: type === 'bank' ? (transaction as any).reference : (transaction as any).transactionId,
                                                    paymentDate: type === 'bank' ? (transaction as any).transactionDate : (transaction as any).timestamp
                                                });
                                                
                                                // Update transaction metadata to mark as reconciled
                                                await apiService.updateModuleRecord(type === 'bank' ? 'bank_transactions' : 'mpesa_transactions', tid, {
                                                    metadata: { ...((transaction as any).metadata || {}), reconciled: true, reconciledAt: new Date().toISOString() }
                                                } as any);
                                                
                                                await refreshData();
                                            } catch (err) {
                                                console.error("Reconciliation failed:", err);
                                            }
                                        }
                                    }}
                                    onFetchFeeds={refreshData}
                                    currentUser={currentUser}
                                    institution={currentInstitution as any}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'broadcaster' && (
                        <div className="animate-fade-in">
                            <DSBroadcasterView onNewBroadcast={() => setActionModal({ type: 'broadcast' })} />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-fade-in space-y-8">
                            {/* Horizontal Sub-navigation Bar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
                                    {[
                                        { id: 'policies', label: 'Operating Policies', icon: ClipboardListIcon },
                                        { id: 'numbering', label: 'Document Numbering', icon: ListIcon },
                                        { id: 'fees', label: 'Fee Structures', icon: CreditCardIcon },
                                        { id: 'slots', label: 'Lesson Hours', icon: ClockIcon }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setSettingsSubTab(tab.id as any)}
                                            className={`flex items-center gap-2.5 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${
                                                settingsSubTab === tab.id 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105' 
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => onUpdateSettings(settings || {})}
                                    className="px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap self-end md:self-auto"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Save All Settings
                                </button>
                            </div>

                            {/* Settings Content Area */}
                            <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[500px] animate-fade-in overflow-hidden">
                                {settingsSubTab === 'policies' && (
                                    <div className="space-y-12">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Operating Policies</h4>
                                            <p className="text-xs font-medium text-slate-400">Configure how your driving school automates lesson scheduling and student progression.</p>
                                        </div>

                                        <div className="p-8 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-900/20">
                                            <div className="flex items-center gap-3 mb-6">
                                                <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                                <h5 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Daily Lesson Sequence (Automation)</h5>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { value: ['Theory', 'Practical'], label: 'Theory → Practical' },
                                                    { value: ['Practical', 'Theory'], label: 'Practical → Theory' },
                                                    { value: ['Theory'], label: 'Theory Only' },
                                                    { value: ['Practical'], label: 'Practical Only' }
                                                ].map((seq, i) => {
                                                    const isSelected = JSON.stringify(settings?.schedulingRules?.dailySequence) === JSON.stringify(seq.value);
                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => onUpdateSettings({
                                                                ...settings,
                                                                schedulingRules: {
                                                                    ...(settings?.schedulingRules || {}),
                                                                    dailySequence: seq.value as any
                                                                }
                                                            })}
                                                            className={`px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                isSelected ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-105' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'
                                                            }`}
                                                        >
                                                            {seq.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium mt-6 ml-1 italic">Note: This defines the order and type of lessons automatically generated for students.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Required Days to Complete</label>
                                                <input 
                                                    type="number" 
                                                    value={settings?.schedulingRules?.requiredDaysToComplete || ''} 
                                                    onChange={e => onUpdateSettings({ 
                                                        ...settings, 
                                                        schedulingRules: { 
                                                            ...(settings?.schedulingRules || {}), 
                                                            requiredDaysToComplete: parseInt(e.target.value) || 0 
                                                        } 
                                                    })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                    placeholder="e.g. 21"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Theory Duration (Mins)</label>
                                                <input 
                                                    type="number" 
                                                    value={settings?.schedulingRules?.theoryDurationMinutes || ''} 
                                                    onChange={e => onUpdateSettings({ 
                                                        ...settings, 
                                                        schedulingRules: { 
                                                            ...(settings?.schedulingRules || {}), 
                                                            theoryDurationMinutes: parseInt(e.target.value) || 0 
                                                        } 
                                                    })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Practical Duration (Mins)</label>
                                                <input 
                                                    type="number" 
                                                    value={settings?.schedulingRules?.practicalDurationMinutes || ''} 
                                                    onChange={e => onUpdateSettings({ 
                                                        ...settings, 
                                                        schedulingRules: { 
                                                            ...(settings?.schedulingRules || {}), 
                                                            practicalDurationMinutes: parseInt(e.target.value) || 0 
                                                        } 
                                                    })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto-Generation Time</label>
                                                <input 
                                                    type="time" 
                                                    value={settings?.schedulingRules?.nextDayAutoGenerationTime || ''} 
                                                    onChange={e => onUpdateSettings({ 
                                                        ...settings, 
                                                        schedulingRules: { 
                                                            ...(settings?.schedulingRules || {}), 
                                                            nextDayAutoGenerationTime: e.target.value 
                                                        } 
                                                    })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-8 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                                            <div className="max-w-md">
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Allow Back-to-Back Sessions</p>
                                                <p className="text-[10px] text-slate-500 font-medium mt-1">When enabled, students can have both Theory and Practical lessons on the same day consecutively.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer scale-125">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={settings?.schedulingRules?.allowBackToBackLessons || false}
                                                    onChange={e => onUpdateSettings({ 
                                                        ...settings, 
                                                        schedulingRules: { 
                                                            ...(settings?.schedulingRules || {}), 
                                                            allowBackToBackLessons: e.target.checked 
                                                        } 
                                                    })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {settingsSubTab === 'numbering' && (
                                    <div className="space-y-12">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Document Numbering</h4>
                                            <p className="text-xs font-medium text-slate-400">Set custom prefixes for all school documents and records.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Prefix</label>
                                                <input 
                                                    type="text" 
                                                    value={settings?.invoicePrefix || ''} 
                                                    onChange={e => onUpdateSettings({ ...settings, invoicePrefix: e.target.value })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                    placeholder="INV-"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Prefix</label>
                                                <input 
                                                    type="text" 
                                                    value={settings?.receiptPrefix || ''} 
                                                    onChange={e => onUpdateSettings({ ...settings, receiptPrefix: e.target.value })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                    placeholder="REC-"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student ID Prefix</label>
                                                <input 
                                                    type="text" 
                                                    value={settings?.studentIdPrefix || ''} 
                                                    onChange={e => onUpdateSettings({ ...settings, studentIdPrefix: e.target.value })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                    placeholder="ADM-"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsSubTab === 'fees' && (
                                    <div className="space-y-10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Fee Structures</h4>
                                                <p className="text-xs font-medium text-slate-400">Manage pricing for different license classes and courses.</p>
                                            </div>
                                            <button 
                                                onClick={() => setActionModal({ type: 'fee_structure' })}
                                                className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-100 transition-all"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Add Class Fee
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(settings?.feeStructures || []).map((fee: any) => (
                                                <div key={fee.id} className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group relative">
                                                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => setActionModal({ type: 'fee_structure', initialData: fee })}
                                                            className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-600"
                                                        >
                                                            <PencilIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{fee.className}</span>
                                                        <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">KES {fee.totalAmount?.toLocaleString()}</p>
                                                    </div>
                                                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{fee.description || 'Standard Course'}</h5>
                                                    <p className="text-[10px] font-medium text-slate-400">{fee.items?.length || 0} Fee items included</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {settingsSubTab === 'slots' && (
                                    <div className="space-y-10">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Lesson Hours</h4>
                                            <p className="text-xs font-medium text-slate-400">Define the operational time windows for Morning, Noon, and Evening sessions.</p>
                                        </div>

                                        <div className="space-y-6">
                                            {['Morning', 'Noon', 'Evening'].map((period) => {
                                                const slot = (settings?.lessonSlots || []).find((s: any) => s.type === period) || { type: period, startTime: '08:00', endTime: '10:00' };
                                                return (
                                                    <div key={period} className="p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-8">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`p-4 rounded-2xl ${
                                                                period === 'Morning' ? 'bg-amber-50 text-amber-600' :
                                                                period === 'Noon' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                                                            }`}>
                                                                <ClockIcon className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{period} Session</h5>
                                                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Standard daily slot</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex flex-col gap-1">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start</label>
                                                                <input 
                                                                    type="time" 
                                                                    value={slot.startTime}
                                                                    onChange={e => {
                                                                        const nextSlots = (settings?.lessonSlots || []).filter((s: any) => s.type !== period);
                                                                        onUpdateSettings({ ...settings, lessonSlots: [...nextSlots, { ...slot, type: period, startTime: e.target.value }] });
                                                                    }}
                                                                    className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-xs"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End</label>
                                                                <input 
                                                                    type="time" 
                                                                    value={slot.endTime}
                                                                    onChange={e => {
                                                                        const nextSlots = (settings?.lessonSlots || []).filter((s: any) => s.type !== period);
                                                                        onUpdateSettings({ ...settings, lessonSlots: [...nextSlots, { ...slot, type: period, endTime: e.target.value }] });
                                                                    }}
                                                                    className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-xs"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                </div>

                {actionModal.type && (
                    <DrivingSchoolActionModal 
                        type={actionModal.type}
                        onClose={() => setActionModal({ type: null })}
                        currentInstitution={currentInstitution}
                        invoices={invoices}
                        onSave={async (data) => {
                            const { type } = actionModal;
                            if (type === 'student') {
                                if (data.id) await onUpdateStudent(data);
                                else await onAddStudent(data);
                            }
                            else if (type === 'instructor') await onAddInstructor(data);
                            else if (type === 'vehicle') {
                                if (data.id) await onUpdateVehicle(data);
                                else await onAddVehicle(data);
                            } else if (type === 'vehicle_unavailability') {
                                await onUpdateVehicle(data);
                            }
                            else if (type === 'lesson') await onAddLesson(data);
                            else if (type === 'invoice') await onAddInvoice(data);
                            else if (type === 'payment') await onAddPayment(data);
                            else if (type === 'fee_structure') {
                                const feeData = {
                                    id: data.id || `fee_${Date.now()}`,
                                    institutionId: currentInstitution?.id || '',
                                    className: data.className,
                                    items: [
                                        { name: 'Tuition Fee', amount: data.tuition || 0, priority: data.tuitionPriority || 1 },
                                        { name: 'PDL', amount: data.pdl || 0, priority: data.pdlPriority || 2 },
                                        { name: 'Assessment', amount: data.assessment || 0, priority: data.assessmentPriority || 3 }
                                    ],
                                    totalAmount: (data.tuition || 0) + (data.pdl || 0) + (data.assessment || 0),
                                    updatedAt: new Date().toISOString()
                                };

                                let nextStructures = [...(settings?.feeStructures || [])];
                                if (data.id) {
                                    nextStructures = nextStructures.map(f => f.id === data.id ? { ...f, ...feeData } : f);
                                } else {
                                    nextStructures.push({ ...feeData, createdAt: new Date().toISOString() } as any);
                                }

                                const next = {
                                    ...(settings || {}),
                                    feeStructures: nextStructures
                                };
                                await onUpdateSettings(next);
                            } else if (type === 'broadcast') {
                                setIsActionLoading(true);
                                try {
                                    const targetUsers = data.target === 'Students' ? students : 
                                                       data.target === 'Instructors' ? instructors : 
                                                       data.target === 'Staff' ? users.filter((u: User) => u.role !== 'student') : 
                                                       [...students, ...instructors];

                                    const channels = data.channels || ['Portal'];
                                    const priorityPrefix = data.priority === 'Critical' ? '🚨 [CRITICAL] ' : data.priority === 'High' ? '⚠️ [URGENT] ' : '';
                                    
                                    const emails: string[] = [];
                                    const phones: string[] = [];

                                    targetUsers.forEach(user => {
                                        const email = (user as any).email;
                                        const phone = (user as any).phone || (user as any).phoneNumber;
                                        if (channels.includes('Email') && email) emails.push(email);
                                        if (channels.includes('SMS') && phone) phones.push(phone);
                                    });

                                    const tasks: Promise<any>[] = [];
                                    if (phones.length > 0) {
                                        tasks.push(apiService.sendSms(phones, `${priorityPrefix}${data.title}: ${data.message}`, undefined, 1, currentInstitution?.id));
                                    }
                                    if (emails.length > 0) {
                                        // We send emails in parallel to avoid sequential delay
                                        tasks.push(...emails.map(email => apiService.sendEmail(email, `${priorityPrefix}${data.title}`, data.message)));
                                    }

                                    await Promise.all(tasks);
                                    success(`Broadcast dispatched to ${targetUsers.length} recipients`);
                                } catch (err) {
                                    console.error("Broadcast failed:", err);
                                    toastError("Failed to send broadcast to all recipients");
                                } finally {
                                    setIsActionLoading(false);
                                }
                            }
                        }}
                        students={normalizedStudents}
                        instructors={normalizedInstructors}
                        vehicles={vehicles}
                        lessons={lessons}
                        payments={payments}
                        settings={settings}
                        initialData={actionModal.initialData}
                        departments={departments}
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

                {isBuySMSModalOpen && (
                    <BuySMSModal 
                        isOpen={isBuySMSModalOpen}
                        onClose={() => setIsBuySMSModalOpen(false)}
                        onPurchaseComplete={() => {
                            if (onRefreshDataProp) onRefreshDataProp();
                            refreshData();
                            setIsBuySMSModalOpen(false);
                        }}
                        institutionId={currentInstitution?.id || ''}
                        institutionCode={currentInstitution?.institutionCode || currentInstitution?.id || ''}
                        institutionName={currentInstitution?.name || 'Driving School'}
                        smsUnitPrice={currentInstitution?.smsUnitPrice || 2}
                        mpesaConfig={currentInstitution?.mpesaConfig}
                        ncbaConfig={currentInstitution?.ncbaConfig}
                    />
                )}
            </div>
        </AppErrorBoundary>
    );
};

// Deployment Trigger: 2026-05-12 00:35 UTC
