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
import { generateDSPDF, generateDSThermalReceipt, generateDSSchedulePDF, generateDSStudentLogbookPDF } from '../../utils/dsPdfGenerator';
import { useToast } from '../../services/ToastContext';
import { useDrivingSchool } from '../../services/DrivingSchoolContext';
import { AppErrorBoundary } from '../common/AppErrorBoundary';

import type { 
    User, DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment, DSFeeStructure, DSFeeItem, LetterheadConfig, DSLead 
} from '../../types';
import { DSBroadcasterView } from './DSBroadcasterView';
import { DSFinanceFeeds } from './DSFinanceFeeds';
import { DSReportsView } from './DSReportsView';
import { BuySMSModal } from '../BuySMSModal';
import { 
    Banknote as BanknotesIcon 
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import * as pdfService from '../../services/pdfService';

interface DrivingSchoolManagerProps {
    currentUser: User;
    currentInstitution: any;
    externalTab?: 'dashboard' | 'students' | 'leads' | 'lessons' | 'fleet' | 'instructors' | 'finance' | 'settings' | 'broadcaster' | 'reports';
    onRefreshData?: () => Promise<void>;
    departments?: any[];
    rooms?: any[];
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

const DrivingSchoolActionModal: React.FC<{ type: string | null, onClose: () => void, students: DSStudent[], instructors: DSInstructor[], vehicles: DSVehicle[], lessons: DSLesson[], invoices: DSInvoice[], payments: DSPayment[], onSave: (data: any) => Promise<void>, settings: DSSettings | null, initialData?: any, currentInstitution?: any, departments?: any[], rooms?: any[] }> = ({ type, onClose, students, instructors, vehicles, lessons, invoices, payments, onSave, settings, initialData, currentInstitution, departments, rooms }) => {
    const { success: toastSuccess, error: toastError } = useToast();
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [previewPdf, setPreviewPdf] = useState<string | null>(null);
    const [scoringStudent, setScoringStudent] = useState<DSStudent | null>(null);

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

    useEffect(() => {
        if (initialData) {
            if (type === 'fee_structure') {
                let itemsArr: any[] = [];
                if (typeof initialData.items === 'string') {
                    try { itemsArr = JSON.parse(initialData.items); } catch(e){}
                } else if (Array.isArray(initialData.items)) {
                    itemsArr = initialData.items;
                }
                const loadedItems = itemsArr.length > 0 
                    ? itemsArr.map((it: any, idx: number) => ({
                        name: it.name || it.voteName || it.vote_name || 'Fee Item',
                        amount: Number(it.amount ?? it.defaultAmount ?? it.default_amount ?? 0),
                        priority: Number(it.priority ?? idx + 1)
                    }))
                    : [
                        { name: 'Tuition Fee', amount: Number(initialData.tuition || 0), priority: Number(initialData.tuitionPriority || 1) },
                        { name: 'PDL', amount: Number(initialData.pdl || 0), priority: Number(initialData.pdlPriority || 2) },
                        { name: 'Assessment', amount: Number(initialData.assessment || 0), priority: Number(initialData.assessmentPriority || 3) }
                    ].filter(it => it.amount > 0);

                setFormData({
                    ...initialData,
                    description: initialData.description || 'Standard License Course',
                    items: loadedItems.length > 0 ? loadedItems : [{ name: 'Standard Course Fee', amount: Number(initialData.totalAmount || 0), priority: 1 }]
                });
            } else {
                setFormData({ ...initialData });
            }
        }
    }, [initialData, type]);

    const [formData, setFormData] = useState<any>(() => {
        const base = initialData || {
            status: type === 'student' ? 'Enrolled' : type === 'lead' ? 'New Enquiry' : type === 'instructor' ? 'Active' : type === 'vehicle' ? 'Operational' : 'Scheduled',
            admissionNumber: type === 'student' ? nextAdmissionNumber : undefined,
            invoiceNumber: type === 'invoice' ? nextInvoiceNumber : undefined,
            receiptNumber: type === 'payment' ? nextReceiptNumber : undefined
        };
        if (!initialData) {
            if (type === 'student') return { ...base, courseDurationDays: settings?.schedulingRules?.requiredDaysToComplete || settings?.defaultCourseDuration || 21, enrollmentDate: new Date().toISOString().split('T')[0], theoryProgressPercent: 0, practicalProgressPercent: 0 };
            if (type === 'lead') return { ...base, fullName: '', phone: '', email: '', licenseTypeInterested: 'Class B', source: 'Walk-in', quotedAmount: 15000, notes: '' };
            if (type === 'lesson') return { ...base, lessonDate: new Date().toISOString().split('T')[0], startTime: '08:00', endTime: '09:00', lessonType: 'Practical' };
            if (type === 'vehicle') return { ...base, transmission: 'Manual', capacity: 1 };
            if (type === 'instructor') return { ...base, rating: 5, instructorType: 'Driving Instructor' };
            if (type === 'invoice') return { ...base, items: [{ name: 'Tuition Fee', amount: 0, priority: 1 }], totalAmount: 0, paidAmount: 0, balance: 0, status: 'Pending', createdAt: new Date().toISOString() };
            if (type === 'payment') return { ...base, paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'M-Pesa' };
            if (type === 'fee_structure') {
                return { 
                    className: 'CLASS C1', 
                    description: 'Standard License Course',
                    items: [
                        { name: 'Tuition Fee', amount: 15000, priority: 1 },
                        { name: 'PDL', amount: 1500, priority: 2 },
                        { name: 'Assessment', amount: 2000, priority: 3 }
                    ]
                };
            }
            if (type === 'broadcast') return { title: '', message: '', target: 'All', priority: 'Medium', channels: ['Portal'] };
        }
        if (initialData && type === 'fee_structure') {
            let itemsArr: any[] = [];
            if (typeof initialData.items === 'string') {
                try { itemsArr = JSON.parse(initialData.items); } catch(e){}
            } else if (Array.isArray(initialData.items)) {
                itemsArr = initialData.items;
            }
            const loadedItems = itemsArr.length > 0 
                ? itemsArr.map((it: any, idx: number) => ({
                    name: it.name || it.voteName || it.vote_name || 'Fee Item',
                    amount: Number(it.amount ?? it.defaultAmount ?? it.default_amount ?? 0),
                    priority: Number(it.priority ?? idx + 1)
                }))
                : [
                    { name: 'Tuition Fee', amount: Number(initialData.tuition || 0), priority: Number(initialData.tuitionPriority || 1) },
                    { name: 'PDL', amount: Number(initialData.pdl || 0), priority: Number(initialData.pdlPriority || 2) },
                    { name: 'Assessment', amount: Number(initialData.assessment || 0), priority: Number(initialData.assessmentPriority || 3) }
                ].filter(it => it.amount > 0);
            return {
                ...base,
                description: initialData.description || 'Standard License Course',
                items: loadedItems.length > 0 ? loadedItems : [{ name: 'Standard Course Fee', amount: Number(initialData.totalAmount || 0), priority: 1 }]
            };
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
        lead: initialData ? 'Update Walk-in Enquiry' : 'Record New Enquiry',
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
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{title}</h3>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Driving School Excellence</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {type === 'student' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Number</label>
                                    <input required type="text" value={formData.admissionNumber || ''} onChange={e => setFormData({...formData, admissionNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="ADM-001" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input required type="text" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="07XX XXX XXX" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID / Passport Number</label>
                                    <input type="text" value={formData.idNumber || ''} onChange={e => setFormData({...formData, idNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. 12345678" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Category</label>
                                    <select value={formData.licenseTypeInterested || ''} onChange={e => setFormData({...formData, licenseTypeInterested: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="">Select Class</option>
                                        {(settings?.licenseCategories && settings.licenseCategories.length > 0) ? (
                                            settings.licenseCategories.map(cat => (
                                                <option key={cat.id} value={cat.code}>{cat.code} - {cat.name}</option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="Class A">Class A (Motorcycle)</option>
                                                <option value="Class B">Class B (Light Vehicle)</option>
                                                <option value="Class C1">Class C1 (Truck)</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="student@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Date</label>
                                    <input required type="date" value={formData.enrollmentDate || ''} onChange={e => setFormData({...formData, enrollmentDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" />
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
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-80 disabled:cursor-not-allowed text-slate-900 dark:text-slate-100" 
                                        placeholder="e.g. 21"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Lesson Hours</label>
                                    <select 
                                        value={formData.preferredLessonHours || ''} 
                                        onChange={e => setFormData({...formData, preferredLessonHours: e.target.value})} 
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100"
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
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enrollment Status</label>
                                            <select value={formData.status || 'Enrolled'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                                <option value="Enrolled">Enrolled</option>
                                                <option value="Graduated">Graduated</option>
                                                <option value="Dropped">Dropped</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Theory Test Score (%)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                max="100"
                                                value={formData.theoryTestScore ?? ''} 
                                                onChange={e => setFormData({...formData, theoryTestScore: e.target.value === '' ? null : parseInt(e.target.value)})} 
                                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" 
                                                placeholder="e.g. 80"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Practical Test Score (%)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                max="100"
                                                value={formData.practicalTestScore ?? ''} 
                                                onChange={e => setFormData({...formData, practicalTestScore: e.target.value === '' ? null : parseInt(e.target.value)})} 
                                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" 
                                                placeholder="e.g. 85"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NTSA Booking Status</label>
                                            <select value={formData.ntsaBookingStatus || 'Not Booked'} onChange={e => setFormData({...formData, ntsaBookingStatus: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                                <option value="Not Booked">Not Booked</option>
                                                <option value="Eligible">Eligible for Booking</option>
                                                <option value="Booked">Booked for Test</option>
                                                <option value="Passed">Passed NTSA Test</option>
                                                <option value="Failed">Failed NTSA Test</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {type === 'lead' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Full Name</label>
                                    <input required type="text" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. Alice Wambui" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number (For SMS Link)</label>
                                    <input required type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="07XX XXX XXX" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="client@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enquired License Class</label>
                                    <select 
                                        value={formData.licenseTypeInterested || ''} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            const matchedFee = (settings?.licenseCategories || []).find((c: any) => c.code === val);
                                            const amt = matchedFee ? (matchedFee.baseFee || 0) : 15000;
                                            setFormData({...formData, licenseTypeInterested: val, quotedAmount: amt});
                                        }} 
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100"
                                    >
                                        <option value="">Select Class</option>
                                        {(settings?.licenseCategories && settings.licenseCategories.length > 0) ? (
                                            settings.licenseCategories.map((cat: any) => (
                                                <option key={cat.id} value={cat.code}>{cat.code} - {cat.name} (KES {Number(cat.baseFee || 0).toLocaleString()})</option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="Class A">Class A (Motorcycle)</option>
                                                <option value="Class B">Class B (Light Vehicle)</option>
                                                <option value="Class C1">Class C1 (Truck)</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enquiry Source</label>
                                    <select value={formData.source || 'Walk-in'} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="Walk-in">Walk-in Visit</option>
                                        <option value="Phone">Phone Call</option>
                                        <option value="Online">Online Portal</option>
                                        <option value="Referral">Referral</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimated Quoted Fee (KES)</label>
                                    <input type="number" value={formData.quotedAmount || 0} onChange={e => setFormData({...formData, quotedAmount: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select value={formData.status || 'New Enquiry'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="New Enquiry">New Enquiry</option>
                                        <option value="Quotation Sent">Quotation Sent</option>
                                        <option value="Follow-up">Follow-up</option>
                                        <option value="Converted">Converted to Student</option>
                                        <option value="Lost">Lost / Not Interested</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Discussion / Notes</label>
                                    <textarea rows={3} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-900 dark:text-slate-100" placeholder="Client questions, requested discounts, follow-up timeline..." />
                                </div>
                            </>
                        )}

                        {type === 'instructor' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructor Name</label>
                                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. David Kimani" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="07XX XXX XXX" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specialization</label>
                                    <input type="text" value={formData.specialization || ''} onChange={e => setFormData({...formData, specialization: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. Heavy Commercial" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructor Type</label>
                                    <select value={formData.instructorType || 'Driving Instructor'} onChange={e => setFormData({...formData, instructorType: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="Driving Instructor">Driving Instructor (Practical)</option>
                                        <option value="Theory Trainer">Theory Trainer (Classroom)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Number</label>
                                    <input type="text" value={formData.licenseNumber || ''} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="DL-XXXXXX" />
                                </div>
                                {formData.instructorType === 'Driving Instructor' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Vehicle</label>
                                        <select value={formData.assignedVehicleId || ''} onChange={e => setFormData({...formData, assignedVehicleId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                            <option value="">No Assigned Vehicle</option>
                                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                    <select required value={formData.departmentId || ''} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
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
                                    <input required type="text" value={formData.make || ''} onChange={e => setFormData({...formData, make: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. Toyota" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Model</label>
                                    <input required type="text" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. Hilux" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plate Number</label>
                                    <input required type="text" value={formData.plateNumber || ''} onChange={e => setFormData({...formData, plateNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="KXY 000X" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transmission</label>
                                    <select value={formData.transmission || 'Manual'} onChange={e => setFormData({...formData, transmission: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="Manual">Manual</option>
                                        <option value="Automatic">Automatic</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Capacity</label>
                                    <input required type="number" min="1" value={formData.capacity || 1} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. 4" />
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
                                            <input type="text" id="un_reason" className="w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" placeholder="e.g. Routine Service" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                            <input type="date" id="un_start" className="w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                            <input type="date" id="un_end" className="w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" />
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
                                    <select required value={formData.studentId || ''} onChange={e => setFormData({...formData, studentId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="">Select Student</option>
                                        {(students || []).map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructor</label>
                                    <select value={formData.instructorId || ''} onChange={e => {
                                        const instId = e.target.value;
                                        const inst = (instructors || []).find(i => i.id === instId);
                                        const linkedVehicle = (vehicles || []).find(v => v.id === inst?.assignedVehicleId) || (vehicles || []).find(v => (v as any).assignedInstructorId === instId);
                                        
                                        setFormData({
                                            ...formData, 
                                            instructorId: instId,
                                            vehicleId: linkedVehicle?.id || formData.vehicleId
                                        });
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="">Select Instructor</option>
                                        {(instructors || [])
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
                                    <input required type="date" value={formData.lessonDate || ''} onChange={e => setFormData({...formData, lessonDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Type</label>
                                    <select value={formData.lessonType || 'Practical'} onChange={e => setFormData({...formData, lessonType: e.target.value, vehicleId: e.target.value === 'Theory' ? undefined : formData.vehicleId, roomId: e.target.value === 'Practical' ? undefined : formData.roomId, roomName: e.target.value === 'Practical' ? undefined : formData.roomName})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="Practical">Practical (Driving)</option>
                                        <option value="Theory">Theory (Classroom)</option>
                                    </select>
                                </div>
                                {(!formData.lessonType || formData.lessonType === 'Practical') ? (
                                    <div className="space-y-2 animate-fade-in">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle</label>
                                        <select value={formData.vehicleId || ''} onChange={e => {
                                            const vhId = e.target.value;
                                            const vh = (vehicles || []).find(v => v.id === vhId);
                                            const linkedInstructor = (instructors || []).find(i => i.id === (vh as any)?.assignedInstructorId) || (instructors || []).find(i => i.assignedVehicleId === vhId);

                                            setFormData({
                                                ...formData, 
                                                vehicleId: vhId,
                                                instructorId: linkedInstructor?.id || formData.instructorId
                                            });
                                        }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                            <option value="">Select Vehicle</option>
                                            {(vehicles || []).map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-2 animate-fade-in">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Room (Theory Class)</label>
                                        <select value={formData.roomId || ''} onChange={e => {
                                            const rmId = e.target.value;
                                            const rm = (rooms || []).find(r => r.id === rmId);
                                            setFormData({
                                                ...formData,
                                                roomId: rmId,
                                                roomName: rm ? rm.name : ''
                                            });
                                        }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                            <option value="">Select Assigned Room</option>
                                            {(rooms || []).map(r => <option key={r.id} value={r.id}>{r.name} {r.capacity ? `(Capacity: ${r.capacity})` : ''}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                                    <input required type="time" value={formData.startTime || '08:00'} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                                    <input required type="time" value={formData.endTime || '09:00'} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" />
                                </div>

                                {(() => {
                                    if (!formData.lessonDate || !formData.startTime || !formData.endTime) return null;
                                    
                                    // Overlap helper logic
                                    const isOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
                                        return start1 < end2 && start2 < end1;
                                    };

                                    const sameDayLessons = (lessons || []).filter(l => l.lessonDate === formData.lessonDate && l.id !== formData.id && l.status !== 'Cancelled');
                                    
                                    const instructorConflict = formData.instructorId ? sameDayLessons.find(l => l.instructorId === formData.instructorId && isOverlapping(formData.startTime, formData.endTime, l.startTime, l.endTime)) : null;
                                    
                                    const vehicleConflict = formData.vehicleId && formData.lessonType !== 'Theory' ? sameDayLessons.find(l => l.vehicleId === formData.vehicleId && isOverlapping(formData.startTime, formData.endTime, l.startTime, l.endTime)) : null;

                                    const studentInvoices = (invoices || []).filter(inv => inv.studentId === formData.studentId && inv.balance > 0 && inv.status !== 'Fully Paid');
                                    const totalOwed = studentInvoices.reduce((sum, i) => sum + i.balance, 0);
                                    
                                    return (
                                        <div className="md:col-span-2 space-y-3 pt-2">
                                            {instructorConflict && (
                                                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex items-start gap-3 animate-fade-in">
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-tight">Instructor Double-Booking Detected</p>
                                                        <p className="text-[10px] text-rose-700 dark:text-rose-300 mt-0.5">
                                                            This instructor is already teaching another student ({(students || []).find(s => s.id === instructorConflict.studentId)?.fullName || 'Assigned'}) from <strong className="underline">{instructorConflict.startTime} to {instructorConflict.endTime}</strong>.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {vehicleConflict && (
                                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start gap-3 animate-fade-in">
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-tight">Fleet Vehicle Collision Warning</p>
                                                        <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                                                            The selected vehicle is already reserved for a lesson from <strong className="underline">{vehicleConflict.startTime} to {vehicleConflict.endTime}</strong>.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {totalOwed > 0 && (
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/80 rounded-2xl flex items-start gap-3 animate-fade-in">
                                                    <span className="text-base font-black text-blue-600 shrink-0">ℹ️</span>
                                                    <div>
                                                        <p className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-tight">Milestone Installment Lockout Check</p>
                                                        <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                                                            Student has an outstanding fee balance of <strong>KES {totalOwed.toLocaleString()}</strong>. Ensure compliance with your minimum deposit policies prior to highway deployment.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
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
                                                className="text-[10px] bg-transparent border-none focus:ring-0 p-0 font-black text-indigo-600 dark:text-indigo-400 placeholder:text-slate-300 w-24 text-right"
                                            />
                                        </div>
                                    </div>
                                    <select required value={formData.studentId || ''} onChange={e => {
                                        const s = (students || []).find(x => x.id === e.target.value);
                                        setFormData({...formData, studentId: e.target.value, studentName: s?.fullName || ''});
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="">Select Student</option>
                                        {(students || [])
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
                                            setFormData({ ...formData, feeStructureId: '', items: [{ name: 'Tuition Fee', amount: 0, priority: 1 }], totalAmount: 0, balance: 0 });
                                        }
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="">Select Fee Structure</option>
                                        {settings?.feeStructures?.map((fs: DSFeeStructure) => <option key={fs.id} value={fs.id}>{fs.className} (KES {fs.totalAmount.toLocaleString()})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (KES) [Calculated]</label>
                                    <input disabled type="number" value={formData.totalAmount || 0} className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-slate-100 cursor-not-allowed opacity-80" placeholder="0.00" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Number</label>
                                    <input required type="text" value={formData.invoiceNumber || ''} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="INV-DS-XXXX" />
                                </div>
                                <div className="md:col-span-2 p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 space-y-4">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Fee Structure Items (Votes)</h5>
                                            <p className="text-[10px] text-slate-400">Configure customized granular fee items for this invoice.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = Array.isArray(formData.items) ? formData.items : [];
                                                const nextItems = [...current, { name: '', amount: 0, priority: current.length + 1 }];
                                                const sum = nextItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
                                                setFormData({
                                                    ...formData,
                                                    items: nextItems,
                                                    totalAmount: sum,
                                                    balance: sum
                                                });
                                            }}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
                                        >
                                            + Add Custom Row
                                        </button>
                                    </div>

                                    {settings?.votes && Array.isArray(settings.votes) && settings.votes.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Add Vote:</span>
                                            {settings.votes.map((vt: any) => (
                                                <button
                                                    key={vt.id || vt.voteName}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = Array.isArray(formData.items) ? formData.items : [];
                                                        const nextItems = [...current, { 
                                                            name: vt.voteName || vt.vote_name || '', 
                                                            amount: vt.defaultAmount ?? (vt as any).default_amount ?? 0, 
                                                            priority: current.length + 1 
                                                        }];
                                                        const sum = nextItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
                                                        setFormData({ 
                                                            ...formData, 
                                                            items: nextItems,
                                                            totalAmount: sum,
                                                            balance: sum
                                                        });
                                                    }}
                                                    className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-[9px] font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center gap-1"
                                                >
                                                    <PlusIcon className="w-2.5 h-2.5 text-indigo-500" />
                                                    {vt.voteName || vt.vote_name}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {(Array.isArray(formData.items) ? formData.items : []).length > 0 && (
                                         <div className="flex gap-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 select-none">
                                             <div className="flex-[2]">Vote Head / Label</div>
                                             <div className="flex-1 text-right pr-2">Amount (KES)</div>
                                             <div className="w-16 text-center">Priority</div>
                                             <div className="w-8"></div>
                                         </div>
                                    )}

                                    <div className="space-y-2 pt-2">
                                        {(Array.isArray(formData.items) ? formData.items : []).map((it: any, idx: number) => {
                                            return (
                                                <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 animate-fade-in">
                                                    <div className="flex-[2] flex flex-col gap-1">
                                                        <input
                                                            list={`invoice-votes-datalist-${idx}`}
                                                            type="text"
                                                            required
                                                            value={it.name || ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const nextItems = [...formData.items];
                                                                const matchedVote = (settings?.votes || []).find((v: any) => (v.voteName || v.vote_name)?.toLowerCase().trim() === val.toLowerCase().trim());
                                                                nextItems[idx] = { 
                                                                    ...it, 
                                                                    name: val,
                                                                    amount: (matchedVote && it.amount === 0) ? (matchedVote.defaultAmount ?? (matchedVote as any).default_amount ?? 0) : it.amount
                                                                };
                                                                const sum = nextItems.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
                                                                setFormData({ 
                                                                    ...formData, 
                                                                    items: nextItems,
                                                                    totalAmount: sum,
                                                                    balance: sum
                                                                });
                                                            }}
                                                            placeholder="Vote Head Name"
                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold px-3 py-2 text-black dark:text-white focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                        <datalist id={`invoice-votes-datalist-${idx}`}>
                                                            {(settings?.votes || []).map((vt: any) => {
                                                                const n = vt.voteName || vt.vote_name;
                                                                return n ? <option key={vt.id || n} value={n} /> : null;
                                                            })}
                                                        </datalist>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                                            <span className="text-[9px] font-black text-slate-400">KES</span>
                                                            <input
                                                                type="number"
                                                                required
                                                                value={it.amount === 0 ? '' : it.amount}
                                                                onChange={e => {
                                                                    const nextItems = [...formData.items];
                                                                    nextItems[idx] = { ...it, amount: Number(e.target.value) };
                                                                    const sum = nextItems.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
                                                                    setFormData({ 
                                                                        ...formData, 
                                                                        items: nextItems,
                                                                        totalAmount: sum,
                                                                        balance: sum
                                                                    });
                                                                }}
                                                                placeholder="0"
                                                                className="w-full bg-transparent border-none text-xs font-bold p-0 focus:ring-0 text-right text-black dark:text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="w-16">
                                                        <input
                                                            type="number"
                                                            title="Priority Order"
                                                            value={it.priority || idx + 1}
                                                            onChange={e => {
                                                                const nextItems = [...formData.items];
                                                                nextItems[idx] = { ...it, priority: Number(e.target.value) };
                                                                setFormData({ ...formData, items: nextItems });
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold px-2 py-1.5 rounded-xl text-center text-black dark:text-white focus:ring-0"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextItems = formData.items.filter((_: any, i: number) => i !== idx);
                                                            const sum = nextItems.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
                                                            setFormData({ 
                                                                ...formData, 
                                                                items: nextItems,
                                                                totalAmount: sum,
                                                                balance: sum
                                                            });
                                                        }}
                                                        className="p-2 text-slate-300 hover:text-red-500 rounded-xl transition-colors"
                                                        title="Remove Item"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {(Array.isArray(formData.items) ? formData.items : []).length === 0 && (
                                            <p className="text-center text-xs text-slate-400 py-4 font-medium italic">No fee items assigned yet. Click Quick Add or Add Custom Row above.</p>
                                        )}
                                    </div>
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
                                                className="text-[10px] bg-transparent border-none focus:ring-0 p-0 font-black text-indigo-600 dark:text-indigo-400 placeholder:text-slate-300 w-24 text-right"
                                            />
                                        </div>
                                    </div>
                                    <select required value={formData.studentId || ''} onChange={e => {
                                        const s = (students || []).find(x => x.id === e.target.value);
                                        const studentInvoices = (invoices || []).filter(inv => inv.studentId === e.target.value && inv.status !== 'Fully Paid');
                                        const firstInvoice = studentInvoices[0];
                                        setFormData({
                                            ...formData, 
                                            studentId: e.target.value, 
                                            studentName: s?.fullName || '',
                                            invoiceId: firstInvoice?.id || '',
                                            amount: firstInvoice?.balance || 0
                                        });
                                    }} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="">Select Student</option>
                                        {(students || [])
                                            .filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase()))
                                            .map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber})</option>)
                                        }
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice</label>
                                    <select required value={formData.invoiceId || ''} onChange={e => setFormData({...formData, invoiceId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="">Select Invoice</option>
                                        {(invoices || []).filter((inv: any) => !formData.studentId || inv.studentId === formData.studentId).map((inv: any) => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.invoiceNumber} - {inv.studentName} (Bal: {inv.balance?.toLocaleString()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Paid</label>
                                    <input required type="number" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                                    <div className="flex gap-2">
                                        <select value={formData.paymentMethod || 'M-Pesa'} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                            <option value="M-Pesa">M-Pesa</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Bank">Bank Transfer</option>
                                        </select>
                                        
                                        {formData.paymentMethod === 'M-Pesa' && (
                                            <button 
                                                type="button"
                                                disabled={isActionLoading || !formData.amount || !formData.studentId}
                                                onClick={async () => {
                                                    const student = (students || []).find(s => s.id === formData.studentId);
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
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" 
                                            placeholder={formData.paymentMethod === 'M-Pesa' ? "e.g. QXJ1234567" : "e.g. TRF-998877"} 
                                        />
                                    </div>
                                )}
                                {formData.transactionReference && (
                                    <div className="md:col-span-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-2xl">
                                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Transaction Verified: {formData.transactionReference}</p>
                                    </div>
                                )}
                                {initialData && (
                                    <div className="md:col-span-2 space-y-2 animate-fade-in">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            Reason for Edit *
                                        </label>
                                        <textarea 
                                            required 
                                            value={formData.editReason || ''} 
                                            onChange={e => setFormData({...formData, editReason: e.target.value})} 
                                            placeholder="Specify the reason why you are editing this payment record..."
                                            rows={2}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-900 dark:text-slate-100 resize-none"
                                        />
                                    </div>
                                )}
                            </>
                        ) || null}

                        {type === 'fee_structure' && (
                            <div className="md:col-span-2 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Name</label>
                                        <input required type="text" value={formData.className || ''} onChange={e => setFormData({...formData, className: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. CLASS C1" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                            <span>Package Description</span>
                                            <span className="text-[8px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 px-1.5 py-0.5 rounded">Optional</span>
                                        </label>
                                        <input type="text" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-900 dark:text-slate-100" placeholder="e.g. Standard License Course" />
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 space-y-4">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Fee Structure Items (Votes)</h5>
                                            <p className="text-[10px] text-slate-400">Configure customized granular fee items embedded in this package.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = Array.isArray(formData.items) ? formData.items : [];
                                                setFormData({ ...formData, items: [...current, { name: '', amount: 0, priority: current.length + 1 }] });
                                            }}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
                                        >
                                            + Add Custom Row
                                        </button>
                                    </div>

                                    {settings?.votes && Array.isArray(settings.votes) && settings.votes.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Add Vote:</span>
                                            {settings.votes.map((vt: any) => (
                                                <button
                                                    key={vt.id || vt.voteName}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = Array.isArray(formData.items) ? formData.items : [];
                                                        setFormData({ 
                                                            ...formData, 
                                                            items: [...current, { 
                                                                name: vt.voteName || vt.vote_name || '', 
                                                                amount: vt.defaultAmount ?? (vt as any).default_amount ?? 0, 
                                                                priority: current.length + 1 
                                                            }] 
                                                        });
                                                    }}
                                                    className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-[9px] font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center gap-1"
                                                >
                                                    <PlusIcon className="w-2.5 h-2.5 text-indigo-500" />
                                                    {vt.voteName || vt.vote_name}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {(Array.isArray(formData.items) ? formData.items : []).length > 0 && (
                                         <div className="flex gap-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 select-none">
                                             <div className="flex-[2]">Vote Head / Label</div>
                                             <div className="flex-1 text-right pr-2">Amount (KES)</div>
                                             <div className="w-16 text-center">Priority</div>
                                             <div className="w-8"></div>
                                         </div>
                                     )}

                                     <div className="space-y-2 pt-2">
                                         {(Array.isArray(formData.items) ? formData.items : []).map((it: any, idx: number) => {
                                             const isPredefined = (settings?.votes || []).some((v: any) => (v.voteName || v.vote_name)?.toLowerCase().trim() === (it.name || '').toLowerCase().trim());
                                             const selectValue = it.isCustom 
                                                  ? 'custom_other_name' 
                                                  : (isPredefined 
                                                      ? ((settings?.votes || []).find((v: any) => (v.voteName || v.vote_name)?.toLowerCase().trim() === (it.name || '').toLowerCase().trim())?.voteName || it.name)
                                                      : (((it.name || '').trim() === '') ? '' : 'custom_other_name'));

                                             return (
                                                 <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 animate-fade-in">
                                                     <div className="flex-[2] flex flex-col gap-1">
                                                         <input
                                                             list={`votes-datalist-${idx}`}
                                                             type="text"
                                                             required
                                                             value={it.name || ''}
                                                             onChange={e => {
                                                                 const val = e.target.value;
                                                                 const nextItems = [...formData.items];
                                                                 const matchedVote = (settings?.votes || []).find((v: any) => (v.voteName || v.vote_name)?.toLowerCase().trim() === val.toLowerCase().trim());
                                                                 nextItems[idx] = { 
                                                                     ...it, 
                                                                     name: val,
                                                                     amount: (matchedVote && it.amount === 0) ? (matchedVote.defaultAmount ?? (matchedVote as any).default_amount ?? 0) : it.amount
                                                                 };
                                                                 setFormData({ ...formData, items: nextItems });
                                                             }}
                                                             placeholder="Vote Head Name"
                                                             className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                         />
                                                         <datalist id={`votes-datalist-${idx}`}>
                                                             {(settings?.votes || []).map((vt: any) => {
                                                                 const n = vt.voteName || vt.vote_name;
                                                                 return n ? <option key={vt.id || n} value={n} /> : null;
                                                             })}
                                                         </datalist>
                                                     </div>
                                                     <div className="flex-1">
                                                         <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                                                             <span className="text-[9px] font-black text-slate-400 select-none">KES</span>
                                                             <input
                                                                 type="number"
                                                                 required
                                                                 value={it.amount === 0 ? '' : it.amount}
                                                                 onChange={e => {
                                                                     const nextItems = [...formData.items];
                                                                     nextItems[idx] = { ...it, amount: Number(e.target.value) };
                                                                     setFormData({ ...formData, items: nextItems });
                                                                 }}
                                                                 placeholder="0"
                                                                 className="w-full bg-transparent border-none text-xs font-bold p-0 focus:ring-0 text-slate-900 dark:text-slate-100"
                                                             />
                                                         </div>
                                                     </div>
                                                     <div className="w-16">
                                                        <input
                                                             type="number"
                                                             title="Priority Order"
                                                             value={it.priority || idx + 1}
                                                             onChange={e => {
                                                                 const nextItems = [...formData.items];
                                                                 nextItems[idx] = { ...it, priority: Number(e.target.value) };
                                                                 setFormData({ ...formData, items: nextItems });
                                                             }}
                                                             className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold px-2 py-2.5 rounded-xl text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                         />
                                                     </div>
                                                     <button
                                                         type="button"
                                                         onClick={() => {
                                                             const nextItems = formData.items.filter((_: any, i: number) => i !== idx);
                                                             setFormData({ ...formData, items: nextItems });
                                                         }}
                                                         className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                                         title="Remove Item"
                                                     >
                                                         <TrashIcon className="w-4 h-4" />
                                                     </button>
                                                 </div>
                                             );
                                         })}
                                         {(Array.isArray(formData.items) ? formData.items : []).length === 0 && (
                                             <p className="text-center text-xs text-slate-400 py-4 font-medium italic">No fee items assigned yet. Click Quick Add or Add Custom Row above.</p>
                                         )}
                                     </div>

                                    <div className="flex justify-end pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl">
                                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Calculated Total:</span>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">
                                                KES {(Array.isArray(formData.items) ? formData.items : []).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {type === 'broadcast' && (
                            <>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Broadcast Title</label>
                                    <input required type="text" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100" placeholder="e.g. Schedule Update" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Audience</label>
                                    <select value={formData.target || 'All'} onChange={e => setFormData({...formData, target: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
                                        <option value="All">All Institutional Users</option>
                                        <option value="Students">Driving Students Only</option>
                                        <option value="Instructors">Instructors Only</option>
                                        <option value="Staff">Administrative Staff</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Content</label>
                                    <textarea required rows={4} value={formData.message || ''} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold resize-none text-slate-900 dark:text-slate-100 text-xs" placeholder="Type your school-wide message here..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Level</label>
                                    <select value={formData.priority || 'Medium'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none text-slate-900 dark:text-slate-100">
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
                </div>

                    <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
                        <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
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
    rooms: rawRooms,
    letterheadConfig
}) => {
    const rooms = useMemo(() => {
        return (rawRooms || []).filter(r => r && r.institutionId === currentInstitution?.id);
    }, [rawRooms, currentInstitution]);

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
        updateLesson: onUpdateLesson,
        deleteLesson: onDeleteLesson,
        addMastery: onAddMastery,
        updateSettings: onUpdateSettings,
        addInvoice: onAddInvoice,
        addPayment: onAddPayment,
        updatePayment: onUpdatePayment,
        deletePayment: onDeletePayment,
        refreshData,
        mpesaTransactions,
        bankTransactions,
        leads, addLead, updateLead, deleteLead,
        sendLessonNotification
    } = useDrivingSchool();
    
    const [internalTab, setInternalTab] = useState<'dashboard' | 'students' | 'leads' | 'lessons' | 'fleet' | 'instructors' | 'finance' | 'broadcaster' | 'settings' | 'reports' | 'portal' | 'showcase'>('dashboard');
    
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'director';
    const isDirector = currentUser?.role === 'director' || currentUser?.role === 'super_admin';

    const [reasonModal, setReasonModal] = useState<{
        isOpen: boolean;
        type: 'delete' | 'edit';
        onSubmit?: (reason: string) => Promise<void> | void;
    }>({
        isOpen: false,
        type: 'delete'
    });

    const handleRequestDeletion = (paymentId: string) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;
        setReasonModal({
            isOpen: true,
            type: 'delete',
            onSubmit: async (reason) => {
                try {
                    setIsActionLoading(true);
                    await onUpdatePayment({
                        ...payment,
                        status: 'Pending Deletion',
                        deletionReason: reason,
                        deletionRequestedBy: currentUser.name || currentUser.email || 'Admin'
                    });
                } catch (err) {
                    console.error(err);
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    const handleConfirmDeletion = async (paymentId: string) => {
        try {
            setIsActionLoading(true);
            await onDeletePayment(paymentId);
        } catch (err) {
            console.error(err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRejectDeletion = async (paymentId: string) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;
        try {
            setIsActionLoading(true);
            await onUpdatePayment({
                ...payment,
                status: 'Active',
                deletionReason: undefined,
                deletionRequestedBy: undefined
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsActionLoading(false);
        }
    };
    const [financeTab, setFinanceTab] = useState<'records' | 'feeds'>('records');
    const [settingsSubTab, setSettingsSubTab] = useState<'categories' | 'votes' | 'rules' | 'numbering' | 'fees' | 'slots'>('categories');
    const [reportSubTab, setReportSubTab] = useState<'instructor_timetable' | 'sessions'>('instructor_timetable');
    const [leadStatusFilter, setLeadStatusFilter] = useState<string>('All');
    const [selectedReportInstructorId, setSelectedReportInstructorId] = useState<string>('all');
    const [users, setUsers] = useState<User[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [previewPdf, setPreviewPdf] = useState<string | null>(null);
    const [scoringStudent, setScoringStudent] = useState<DSStudent | null>(null);
    
    // Portal states
    const [portalStudentId, setPortalStudentId] = useState<string>('');
    const [portalInstructorId, setPortalInstructorId] = useState<string>('');
    const [portalVehicleId, setPortalVehicleId] = useState<string>('');
    const [portalLessonDate, setPortalLessonDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [portalStartTime, setPortalStartTime] = useState<string>('09:00');
    const [portalEndTime, setPortalEndTime] = useState<string>('10:00');
    const [portalLessonType, setPortalLessonType] = useState<string>('Practical');
    const [isSendingReminders, setIsSendingReminders] = useState(false);
    const [newCategoryInput, setNewCategoryInput] = useState({ code: '', name: '', description: '', baseFee: 0, isActive: true });
    const [newVoteInput, setNewVoteInput] = useState({ voteName: '', defaultAmount: 0, isMandatory: false });
    const [bulkVotesEntries, setBulkVotesEntries] = useState<Array<{ voteName: string; defaultAmount: number; isMandatory: boolean }>>([
        { voteName: '', defaultAmount: 0, isMandatory: false }
    ]);
    const [editingVoteId, setEditingVoteId] = useState<string | null>(null);
    const [editingVotePayload, setEditingVotePayload] = useState<{ voteName: string; defaultAmount: number; isMandatory: boolean }>({ voteName: '', defaultAmount: 0, isMandatory: false });

    const [settingsDraft, setSettingsDraft] = useState<any>(null);
    useEffect(() => {
        if (settings) {
            setSettingsDraft(settings);
        }
    }, [settings]);
    const activeSettings = settingsDraft || settings || {};
    const hasUnsavedChanges = settings && settingsDraft && JSON.stringify(settingsDraft) !== JSON.stringify(settings);

    const handleSendBulkReminders = async () => {
        // Filter out pending invoices with balance > 0
        const pendingInvoices = (invoices || []).filter(inv => inv.status !== 'Fully Paid' && inv.balance > 0);
        if (pendingInvoices.length === 0) {
            success("All student accounts are currently fully settled!");
            return;
        }

        // Collect distinct valid student mobile contacts and build individual notifications
        const targets: { phone: string; message: string; name: string }[] = [];
        pendingInvoices.forEach(inv => {
            const student = (students || []).find(s => s.id === inv.studentId);
            const phone = student?.phone || (student as any)?.phoneNumber;
            if (student && phone) {
                const textMsg = `Hello ${student.fullName.split(' ')[0]}, your driving course account (${inv.invoiceNumber}) has an outstanding balance of KES ${inv.balance.toLocaleString()}. Please settle via M-Pesa to avoid lesson interruption.`;
                targets.push({ phone, message: textMsg, name: student.fullName });
            }
        });

        if (targets.length === 0) {
            toastError("Found pending invoices but no valid student phone numbers attached.");
            return;
        }

        const currentBalance = currentInstitution?.smsBalance || 0;
        if (currentBalance < targets.length) {
            toastError(`Insufficient SMS Units! Required: ${targets.length}, Available: ${currentBalance}. Please top up.`);
            return;
        }

        if (!confirm(`Are you sure you want to broadcast fee reminder SMS notifications to ${targets.length} students?`)) {
            return;
        }

        setIsSendingReminders(true);
        try {
            // Dispatch personalized SMS batches
            const tasks = targets.map(t => 
                apiService.sendSms(t.phone, t.message, currentInstitution?.smsConfig, 1, currentInstitution?.id)
            );
            await Promise.all(tasks);
            
            const remainingBalance = Math.max(0, currentBalance - targets.length);
            success(`Successfully dispatched fee reminders to ${targets.length} students! Remaining Units: ${remainingBalance}.`);
        } catch (err) {
            console.error("Bulk reminders failure:", err);
            toastError("Failed to deliver some fee reminder notifications.");
        } finally {
            setIsSendingReminders(false);
        }
    };

    const handleSendPdlExpiryAlerts = async () => {
        const daysThreshold = settings?.schedulingRules?.pdlExpiryDaysThreshold || 75;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
        
        const eligibleStudents = (students || []).filter(s => {
            if (s.status !== 'Enrolled' || !s.enrollmentDate) return false;
            return new Date(s.enrollmentDate) <= thresholdDate;
        });

        const targets: { phone: string; message: string }[] = [];
        eligibleStudents.forEach(s => {
            const phone = s.phone || (s as any).phoneNumber;
            if (phone) {
                const customTemplate = settings?.schedulingRules?.pdlExpirySmsTemplate;
                const message = customTemplate
                    ? customTemplate
                        .replace(/{student}/g, s.fullName.split(' ')[0])
                        .replace(/{fullName}/g, s.fullName)
                        .replace(/{course}/g, s.admissionNumber || 'your course')
                    : `Hello ${s.fullName.split(' ')[0]}, your NTSA PDL assigned to ${s.admissionNumber || 'your course'} is nearing its 90-day regulatory expiry. Please contact the front desk to arrange test assessment booking.`;
                targets.push({ phone, message });
            }
        });

        if (targets.length === 0) {
            success("No active students currently have expiring PDLs within the warning window.");
            return;
        }

        const currentBalance = currentInstitution?.smsBalance || 0;
        if (currentBalance < targets.length) {
            toastError(`Insufficient SMS Units! Required: ${targets.length}, Available: ${currentBalance}.`);
            return;
        }

        if (!confirm(`Broadcast PDL expiry warnings to ${targets.length} candidates?`)) return;

        setIsSendingReminders(true);
        try {
            await Promise.all(targets.map(t => apiService.sendSms(t.phone, t.message, currentInstitution?.smsConfig, 1, currentInstitution?.id)));
            success(`Successfully dispatched PDL expiry alerts to ${targets.length} candidates!`);
        } catch (err) {
            toastError("Failed to dispatch some PDL alerts.");
        } finally {
            setIsSendingReminders(false);
        }
    };

    const handleSendTestDayReminders = async () => {
        const progressThreshold = settings?.schedulingRules?.testDayProgressThreshold || 80;
        const eligibleStudents = (students || []).filter(s => s.status === 'Enrolled' && (s.practicalProgressPercent || 0) >= progressThreshold);

        const targets: { phone: string; message: string }[] = [];
        eligibleStudents.forEach(s => {
            const phone = s.phone || (s as any).phoneNumber;
            if (phone) {
                const customTemplate = settings?.schedulingRules?.testDaySmsTemplate;
                const message = customTemplate
                    ? customTemplate
                        .replace(/{student}/g, s.fullName.split(' ')[0])
                        .replace(/{fullName}/g, s.fullName)
                        .replace(/{progress}/g, String(s.practicalProgressPercent || 0))
                    : `Hello ${s.fullName.split(' ')[0]}, congratulations on reaching ${s.practicalProgressPercent}% practical mastery! Please submit your passport photos and original ID for final NTSA Test booking routing.`;
                targets.push({ phone, message });
            }
        });

        if (targets.length === 0) {
            success(`No candidate meets the ${progressThreshold}% practical progress milestone currently.`);
            return;
        }

        const currentBalance = currentInstitution?.smsBalance || 0;
        if (currentBalance < targets.length) {
            toastError(`Insufficient SMS Units! Required: ${targets.length}, Available: ${currentBalance}.`);
            return;
        }

        if (!confirm(`Broadcast Assessment Test preparation notices to ${targets.length} candidates?`)) return;

        setIsSendingReminders(true);
        try {
            await Promise.all(targets.map(t => apiService.sendSms(t.phone, t.message, currentInstitution?.smsConfig, 1, currentInstitution?.id)));
            success(`Successfully dispatched Test prep notifications to ${targets.length} candidates!`);
        } catch (err) {
            toastError("Failed to dispatch some test notifications.");
        } finally {
            setIsSendingReminders(false);
        }
    };


    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchUsers(currentInstitution.id).then(setUsers).catch(console.error);
            
            // Auto-migration for new schema fields (Safe execution)
            const migrations = [
                "ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS preferred_lesson_hours text;",
                "ALTER TABLE ds_vehicles ADD COLUMN IF NOT EXISTS assigned_instructor_id text;",
                "ALTER TABLE ds_lessons ADD COLUMN IF NOT EXISTS confirmation_status text;",
                "ALTER TABLE ds_lessons ADD COLUMN IF NOT EXISTS room_id text;",
                "ALTER TABLE ds_lessons ADD COLUMN IF NOT EXISTS room_name text;",
                "ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS theory_test_score integer;",
                "ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS practical_test_score integer;",
                "ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS ntsa_booking_status text;"
            ];

            migrations.forEach(sql => {
                apiService.runMigration(sql).catch(() => {
                    // Silently ignore if column already exists or restricted
                });
            });
        }
    }, [currentInstitution?.id]);

    const handleAutoGenerateTomorrow = async () => {
        const sequence = settings?.schedulingRules?.dailySequence?.length 
            ? settings.schedulingRules.dailySequence 
            : ['Theory', 'Practical'];

        setIsActionLoading(true);
        setUnassignedDueToVehicles([]); // Reset previous tracking list
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            // 1. Filter students who have active enrollment
            const eligibleStudents = (students || []).filter(s => s.status === 'Enrolled');
            
            // Track busy vehicles grouped by simultaneous time slots
            const assignedVehiclesBySlot: Record<string, Set<string>> = {};
            // Pre-populate with pre-existing busy vehicles for tomorrow
            (lessons || []).filter(l => l.lessonDate === dateStr && l.vehicleId).forEach(l => {
                const startTimeKey = l.startTime || '08:00';
                if (!assignedVehiclesBySlot[startTimeKey]) {
                    assignedVehiclesBySlot[startTimeKey] = new Set<string>();
                }
                assignedVehiclesBySlot[startTimeKey].add(l.vehicleId!);
            });

            let lessonsAdded = 0;
            let skippedStudents = 0;
            const leftOutCandidates: Array<{ name: string; slot: string }> = [];
            const lessonsToSave: any[] = [];

            for (const student of eligibleStudents) {
                // Robust duplicate prevention: check if student already has a lesson scheduled for tomorrow
                const existingLessonsTomorrow = (lessons || []).filter(l => l.studentId === student.id && l.lessonDate === dateStr);
                if (existingLessonsTomorrow.length > 0) {
                    skippedStudents++;
                    continue;
                }

                // Get student's preferred slot or default to Morning
                const preferredSlotType = student.preferredLessonHours || 'Morning';
                const slot = (settings?.lessonSlots || []).find(s => s.type === preferredSlotType) || { startTime: '08:00', endTime: '10:00' };
                
                let currentTime = slot.startTime || '08:00';
                if (!currentTime.includes(':')) currentTime = '08:00';
                
                let missingVehicleConstraint = false;
                let targetSlotTime = currentTime;
                
                // For each type in the sequence (e.g., Theory, Practical)
                for (const type of sequence) {
                    const duration = type === 'Theory' 
                        ? (settings?.schedulingRules?.theoryDurationMinutes || 60)
                        : (settings?.schedulingRules?.practicalDurationMinutes || 60);
                    
                    // Simple end time calculation
                    const parts = currentTime.split(':');
                    const h = Number(parts[0]) || 8;
                    const m = Number(parts[1]) || 0;
                    
                    const end = new Date();
                    end.setHours(h, m + duration, 0, 0);
                    const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

                    // Assign instructor based on type
                    const instructor = type === 'Theory' 
                        ? (instructors || []).find(i => i.instructorType === 'Theory Trainer')
                        : (instructors || []).find(i => i.instructorType === 'Driving Instructor' || !i.instructorType);
                    
                    let vehicle: any = undefined;
                    if (type === 'Practical') {
                        const operationalVehicles = (vehicles || []).filter(v => v.status === 'Operational');
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

                    const defaultRoom = type === 'Theory' ? (rooms || [])[0] : undefined;

                    // Generate a cryptographically safe unique ID to bypass concurrency collisions
                    const uniqueLessonId = `less_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                    lessonsToSave.push({
                        id: uniqueLessonId,
                        studentId: student.id,
                        instructorId: instructor?.id || null,
                        vehicleId: vehicle?.id || null,
                        roomId: defaultRoom?.id || null,
                        roomName: defaultRoom?.name || null,
                        lessonDate: dateStr,
                        startTime: currentTime,
                        endTime: endTime,
                        lessonType: type as any,
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

            // Save all lessons to the database in bulk
            for (const lesson of lessonsToSave) {
                await apiService.saveModuleRecord('ds_lessons', lesson);
            }

            if (leftOutCandidates.length > 0) {
                setUnassignedDueToVehicles(leftOutCandidates);
                setActiveTab('lessons'); // Redirect to lessons view to prominently showcase the capacity warning list
            }

            if (lessonsAdded > 0) {
                success(`Auto-generated ${lessonsAdded} lessons for tomorrow (${dateStr})`);
                
                // Dispatch notifications in the background to not block UI or slow down main flow
                if (sendLessonNotification) {
                    lessonsToSave.forEach(lesson => {
                        sendLessonNotification(lesson, false).catch(e => {
                            console.error("[DS Automation] Failed to dispatch lesson notifications in background:", e);
                        });
                    });
                }
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

        const sequence = settings?.schedulingRules?.dailySequence?.length 
            ? settings.schedulingRules.dailySequence 
            : ['Theory', 'Practical'];

        setIsActionLoading(true);
        try {
            // Fill available slots for the next 14 days
            let lessonsAdded = 0;
            const daysToSchedule = 14; 
            const lessonsToSave: any[] = [];
            
            for (let i = 1; i <= daysToSchedule; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);
                // Skip Sundays
                if (date.getDay() === 0) continue;

                const dateStr = date.toISOString().split('T')[0];

                // Check if student already has lessons on this date
                const existingOnDate = (lessons || []).filter(l => l.studentId === studentId && l.lessonDate === dateStr);
                if (existingOnDate.length > 0) continue;

                const preferredSlotType = student.preferredLessonHours || 'Morning';
                const slot = (settings?.lessonSlots || []).find(s => s.type === preferredSlotType) || { startTime: '08:00', endTime: '10:00' };
                
                let currentTime = slot.startTime || '08:00';
                if (!currentTime.includes(':')) currentTime = '08:00';
                
                for (const type of sequence) {
                    const duration = type === 'Theory' 
                        ? (settings?.schedulingRules?.theoryDurationMinutes || 60)
                        : (settings?.schedulingRules?.practicalDurationMinutes || 60);
                    
                    const parts = currentTime.split(':');
                    const h = Number(parts[0]) || 8;
                    const m = Number(parts[1]) || 0;
                    
                    const end = new Date();
                    end.setHours(h, m + duration, 0, 0);
                    const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

                    const instructor = type === 'Theory' 
                        ? instructors.find(inst => inst.instructorType === 'Theory Trainer')
                        : instructors.find(inst => inst.instructorType === 'Driving Instructor' || !inst.instructorType);
                    
                    const vehicle = type === 'Practical' 
                        ? (vehicles.find(v => v.id === instructor?.assignedVehicleId) || vehicles.find(v => v.status === 'Operational'))
                        : undefined;

                    const defaultRoom = type === 'Theory' ? (rooms || [])[0] : undefined;

                    const uniqueLessonId = `less_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                    lessonsToSave.push({
                        id: uniqueLessonId,
                        studentId: student.id,
                        instructorId: instructor?.id || null,
                        vehicleId: vehicle?.id || null,
                        roomId: defaultRoom?.id || null,
                        roomName: defaultRoom?.name || null,
                        lessonDate: dateStr,
                        startTime: currentTime,
                        endTime: endTime,
                        lessonType: type as any,
                        status: 'Scheduled',
                        confirmationStatus: 'Pending',
                        institutionId: currentInstitution?.id
                    });
                    
                    lessonsAdded++;
                    currentTime = endTime;
                }
            }

            // Save all lessons to the database
            for (const lesson of lessonsToSave) {
                await apiService.saveModuleRecord('ds_lessons', lesson);
            }

            if (lessonsAdded > 0) {
                success(`Auto-scheduled ${lessonsAdded} lessons for ${student.fullName} over the next 14 days.`);
                
                // Dispatch notifications in the background to not block UI or slow down main flow
                if (sendLessonNotification) {
                    lessonsToSave.forEach(lesson => {
                        sendLessonNotification(lesson, false).catch(e => {
                            console.error("[DS Automation] Failed to dispatch lesson notifications in background:", e);
                        });
                    });
                }
            } else {
                success(`No new lessons needed for ${student.fullName} over the next 14 days.`);
            }

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
    const [actionModal, setActionModal] = useState<{ type: 'student' | 'instructor' | 'vehicle' | 'vehicle_unavailability' | 'lesson' | 'invoice' | 'payment' | 'fee_structure' | 'broadcast' | 'lead' | null; data?: any; initialData?: any }>({ type: null });
    const [unassignedDueToVehicles, setUnassignedDueToVehicles] = useState<Array<{ name: string; slot: string }>>([]);
    const [selectedQRLesson, setSelectedQRLesson] = useState<any | null>(null);

    // Normalization
    const normalizedStudents = useMemo(() => (students || []).map(s => ({
        ...s,
        fullName: s.fullName || (s as any).full_name || (s as any).name || '(No Name)',
    })), [students]);

    const normalizedInstructors = useMemo(() => (instructors || []).map(i => ({
        ...i,
        name: i.name || (i as any).full_name || (i as any).fullName || '(No Name)',
    })), [instructors]);

    const filteredStudents = useMemo(() => 
        (normalizedStudents || []).filter(s => 
            (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.idNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [normalizedStudents, searchTerm]);

    const filteredLessons = useMemo(() => 
        (lessons || []).filter(l => {
            const student = (normalizedStudents || []).find(s => s.id === l.studentId);
            const instructor = (normalizedInstructors || []).find(i => i.id === l.instructorId);
            return (student?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (instructor?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (l.topic || '').toLowerCase().includes(searchTerm.toLowerCase());
        }),
    [lessons, normalizedStudents, normalizedInstructors, searchTerm]);

    const filteredVehicles = useMemo(() => 
        (vehicles || []).filter(v => 
            (v.plateNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.make || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.model || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [vehicles, searchTerm]);

    const filteredInstructors = useMemo(() => 
        (normalizedInstructors || []).filter(i => 
            (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.specialization || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [normalizedInstructors, searchTerm]);

    const filteredInvoices = useMemo(() => 
        (invoices || []).filter(inv => 
            (inv.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [invoices, searchTerm]);

    const filteredPayments = useMemo(() => 
        (payments || []).filter(pay => {
            const student = (normalizedStudents || []).find(s => s.id === pay.studentId);
            return (pay.studentName || student?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                   (pay.receiptNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
        }),
    [payments, normalizedStudents, searchTerm]);

    const filteredLeads = useMemo(() => 
        (leads || []).filter(l => {
            const matchesSearch = (l.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (l.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (l.licenseTypeInterested || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = leadStatusFilter === 'All' || (l.status || 'New Enquiry').toLowerCase() === leadStatusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        }),
    [leads, searchTerm, leadStatusFilter]);

    const stats = useMemo(() => ({
        totalStudents: (students || []).length,
        activeInstructors: (instructors || []).filter(i => i.status === 'Active').length,
        operationalVehicles: (vehicles || []).filter(v => v.status === 'Operational').length,
        pendingLessons: (lessons || []).filter(l => l.status === 'Scheduled').length,
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
                                        leads: 'lead',
                                        lessons: 'lesson',
                                        fleet: 'vehicle',
                                        instructors: 'instructor',
                                        finance: 'invoice',
                                        settings: 'fee_structure',
                                        broadcaster: 'broadcast'
                                    };
                                    setActionModal({ type: typeMap[activeTab] || 'student' });
                                }} 
                                className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {activeTab === 'students' ? 'Enroll Student' :
                                 activeTab === 'leads' ? 'New Enquiry Lead' :
                                 activeTab === 'lessons' ? 'Schedule Lesson' :
                                 activeTab === 'fleet' ? 'Register Vehicle' :
                                 activeTab === 'instructors' ? 'Add Instructor' :
                                 activeTab === 'finance' ? 'Generate Invoice' :
                                 activeTab === 'settings' ? 'Add Class Fee' :
                                 activeTab === 'broadcaster' ? 'New Broadcast' : 'New Action'}
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
                            { id: 'leads', label: 'Enquiries', icon: SparklesIcon },
                            { id: 'lessons', label: 'Lessons', icon: CalendarDaysIcon },
                            { id: 'portal', label: 'Student Portal', icon: SparklesIcon },
                            { id: 'fleet', label: 'Fleet', icon: TruckIcon },
                            { id: 'instructors', label: 'Instructors', icon: AcademicCapIcon },
                            { id: 'finance', label: 'Finance', icon: CurrencyIcon },
                            { id: 'broadcaster', label: 'Broadcaster', icon: SparklesIcon },
                            { id: 'reports', label: 'Reports', icon: ClipboardListIcon },
                            { id: 'showcase', label: 'Showcase', icon: SparklesIcon },
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
                                        {(lessons || []).filter(l => l.status === 'Scheduled').slice(0, 5).map(lesson => (
                                            <div key={lesson.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                                                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                                    <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {(students || []).find(s => s.id === lesson.studentId)?.fullName || 'Student'}
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
                                        {(lessons || []).filter(l => l.status === 'Scheduled').length === 0 && (
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
                                            <th className="px-10 py-8 text-right">Test Scores</th>
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
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                            Theory: <span className={student.theoryTestScore !== undefined && student.theoryTestScore !== null ? "text-indigo-600 font-black" : "text-slate-400 italic"}>
                                                                {student.theoryTestScore !== undefined && student.theoryTestScore !== null ? `${student.theoryTestScore}%` : 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                            Practical: <span className={student.practicalTestScore !== undefined && student.practicalTestScore !== null ? "text-emerald-600 font-black" : "text-slate-400 italic"}>
                                                                {student.practicalTestScore !== undefined && student.practicalTestScore !== null ? `${student.practicalTestScore}%` : 'N/A'}
                                                            </span>
                                                        </div>
                                                        {student.ntsaBookingStatus && (
                                                            <span className={`mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                                student.ntsaBookingStatus === 'Passed' ? 'bg-green-50 text-green-600 border border-green-200' :
                                                                student.ntsaBookingStatus === 'Booked' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                                                                student.ntsaBookingStatus === 'Eligible' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                                student.ntsaBookingStatus === 'Failed' ? 'bg-red-50 text-red-600 border border-red-200' :
                                                                'bg-slate-50 text-slate-400 border border-slate-200'
                                                            }`}>
                                                                NTSA: {student.ntsaBookingStatus}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={async () => {
                                                                setIsActionLoading(true);
                                                                try {
                                                                    const doc = await generateDSStudentLogbookPDF(student, lessons, instructors, currentInstitution, letterheadConfig);
                                                                    setPreviewPdf(doc.output('datauristring'));
                                                                    success("Logbook PDF preview loaded!");
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    toastError("Failed to generate student logbook preview.");
                                                                } finally {
                                                                    setIsActionLoading(false);
                                                                }
                                                            }}
                                                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                                            title="Preview NTSA Training Logbook"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={async () => {
                                                                setIsActionLoading(true);
                                                                try {
                                                                    const doc = await generateDSStudentLogbookPDF(student, lessons, instructors, currentInstitution, letterheadConfig);
                                                                    doc.save(`Logbook_${student.admissionNumber || student.fullName.replace(/\s+/g, '_')}.pdf`);
                                                                    success("Logbook PDF downloaded successfully!");
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    toastError("Failed to generate student logbook PDF.");
                                                                } finally {
                                                                    setIsActionLoading(false);
                                                                }
                                                            }}
                                                            className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                                                            title="Print NTSA Training Logbook"
                                                        >
                                                            <PrinterIcon className="w-4 h-4" />
                                                        </button>
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
                                                            onClick={() => setScoringStudent(student)}
                                                            className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                                                            title="Conduct Test & Assessment"
                                                        >
                                                            <ClipboardListIcon className="w-4 h-4" />
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

                    {activeTab === 'leads' && (
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="relative flex-1 max-w-md">
                                    <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search walk-in enquiries..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-16 pr-8 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Filter:</span>
                                    <div className="flex gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                                        {['All', 'New Enquiry', 'Quotation Sent', 'Converted'].map((st) => (
                                            <button 
                                                key={st} 
                                                onClick={() => setLeadStatusFilter(st)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${leadStatusFilter === st ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}
                                            >
                                                {st}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {filteredLeads.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <SparklesIcon className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">No Walk-in Enquiries Found</h4>
                                    <p className="text-xs text-slate-400 mt-1">Record client visits to auto-dispatch fee quotation structures via SMS & Email.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-800">
                                                <th className="px-10 py-8">Client Name</th>
                                                <th className="px-10 py-8">Contact Info</th>
                                                <th className="px-10 py-8">Target License</th>
                                                <th className="px-10 py-8">Source</th>
                                                <th className="px-10 py-8">Status</th>
                                                <th className="px-10 py-8">Est. Quote</th>
                                                <th className="px-10 py-8 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {filteredLeads.map(lead => {
                                                const targetCategory = (settings?.licenseCategories || []).find((c: any) => c.code === lead.licenseTypeInterested || c.name === lead.licenseTypeInterested);
                                                const baseFeeAmount = targetCategory ? (targetCategory.baseFee || 0) : (lead.quotedAmount || 0);
                                                
                                                return (
                                                    <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-10 py-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center font-black text-amber-600">
                                                                    {lead.fullName.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900 dark:text-white">{lead.fullName}</p>
                                                                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">Enquired: {new Date(lead.createdAt).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{lead.phone}</p>
                                                            <p className="text-[10px] font-medium text-slate-400 mt-1">{lead.email || 'No email provided'}</p>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <span className="text-[10px] font-black uppercase px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                                                                {lead.licenseTypeInterested || 'Class B'}
                                                            </span>
                                                            {targetCategory && (
                                                                <p className="text-[9px] font-bold text-indigo-600 mt-1">{targetCategory.name}</p>
                                                            )}
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-800">
                                                                {lead.source}
                                                            </span>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-600' :
                                                                lead.status === 'Quotation Sent' ? 'bg-indigo-50 text-indigo-600' :
                                                                lead.status === 'Lost' ? 'bg-rose-50 text-rose-600' :
                                                                'bg-amber-50 text-amber-600'
                                                            }`}>
                                                                {lead.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-10 py-8 font-black text-slate-900 dark:text-white text-xs">
                                                            KES {baseFeeAmount.toLocaleString()}
                                                        </td>
                                                        <td className="px-10 py-8 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        setIsActionLoading(true);
                                                                        try {
                                                                            const amountStr = `KES ${baseFeeAmount.toLocaleString()}`;
                                                                            const catName = targetCategory ? `${targetCategory.name} (${targetCategory.code})` : (lead.licenseTypeInterested || 'Class B');
                                                                            
                                                                            // 1. Generate premium itemized quotation PDF
                                                                            const fallbackCompanyDetails = { name: currentInstitution?.name || 'Driving School', address: currentInstitution?.location || 'Campus', phone: currentInstitution?.phoneNumber || '', email: currentInstitution?.email || '', pinNo: '' };
                                                                            const pdfDataUri = await pdfService.generateDSQuotationPdfDataUri(
                                                                                lead,
                                                                                targetCategory,
                                                                                baseFeeAmount,
                                                                                currentInstitution || { name: 'Driving School', id: 'ds' },
                                                                                fallbackCompanyDetails as any,
                                                                                letterheadConfig?.headerImageUrl || null
                                                                            );

                                                                            // Convert data URI to file to attempt cloud storage upload for public short link
                                                                            const base64Part = pdfDataUri.split(',')[1];
                                                                            const byteCharacters = atob(base64Part);
                                                                            const byteNumbers = new Array(byteCharacters.length);
                                                                            for (let i = 0; i < byteCharacters.length; i++) {
                                                                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                                            }
                                                                            const byteArray = new Uint8Array(byteNumbers);
                                                                            const blob = new Blob([byteArray], { type: 'application/pdf' });
                                                                            const fileObj = new File([blob], `Quotation_${(lead.fullName || 'Client').replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
                                                                            
                                                                            let quoteUrl = `${window.location.origin}/ds-quote/${lead.id || 'new'}`;
                                                                            try {
                                                                                const uploadRes = await apiService.uploadToGoogleDrive(fileObj, 'DS_Quotations', { institutionId: currentInstitution?.id });
                                                                                if (uploadRes?.success && uploadRes.url) {
                                                                                    quoteUrl = uploadRes.url;
                                                                                }
                                                                            } catch (e) {
                                                                                console.warn("Cloud storage upload fallback bypassed:", e);
                                                                            }

                                                                            const msg = `Hello ${lead.fullName ? lead.fullName.split(' ')[0] : 'Client'}, thank you for your enquiry at ${currentInstitution?.name || 'our Driving School'}. Total investment for ${catName} is ${amountStr}. View your itemized quotation: ${quoteUrl} Visit our administration desk to activate your student enrollment!`;
                                                                            
                                                                            if (confirm(`Send Fee Quotation SMS to ${lead.fullName} (${lead.phone})?\n\nMessage payload:\n"${msg}"`)) {
                                                                                // Ensure live SMS broadcast via gateway
                                                                                const res = await apiService.sendSms(lead.phone, msg, currentInstitution?.smsConfig, 1, currentInstitution?.id);
                                                                                
                                                                                await updateLead({ ...lead, status: 'Quotation Sent', quotedAmount: baseFeeAmount });
                                                                                
                                                                                if (res?.success !== false) {
                                                                                    success(`Quotation PDF generated & live SMS dispatched successfully to ${lead.phone}!`);
                                                                                } else {
                                                                                    success(`Quotation created & logged successfully. Gateway response: ${res?.message || 'Delivered to local gateway queue'}`);
                                                                                }
                                                                            }
                                                                        } catch (err) {
                                                                            console.error("Quote SMS failure:", err);
                                                                            toastError("Failed to dispatch itemized quotation SMS.");
                                                                        } finally {
                                                                            setIsActionLoading(false);
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 rounded-lg font-black text-[9px] uppercase tracking-wider transition-colors flex items-center gap-1"
                                                                    title="Send Quotation via SMS/Email"
                                                                >
                                                                    <SparklesIcon className="w-3 h-3" />
                                                                    Quote SMS
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setActionModal({
                                                                            type: 'student',
                                                                            initialData: {
                                                                                fullName: lead.fullName,
                                                                                phone: lead.phone,
                                                                                email: lead.email || '',
                                                                                licenseTypeInterested: lead.licenseTypeInterested || '',
                                                                                enrollmentDate: new Date().toISOString().split('T')[0],
                                                                                status: 'Enrolled'
                                                                            }
                                                                        });
                                                                        updateLead({ ...lead, status: 'Converted' }).catch(() => {});
                                                                    }}
                                                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-600 rounded-lg font-black text-[9px] uppercase tracking-wider transition-colors"
                                                                    title="Convert to Enrolled Student"
                                                                >
                                                                    Convert
                                                                </button>
                                                                <button
                                                                    onClick={() => setActionModal({ type: 'lead', initialData: lead })}
                                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                                                    title="Edit Lead Details"
                                                                >
                                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteLead(lead.id)}
                                                                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                                                    title="Remove Enquiry"
                                                                >
                                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
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
                                                <th className="px-10 py-6 print:px-4 print:py-3">Vehicle / Room</th>
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
                                                        {lesson.lessonType === 'Theory' 
                                                            ? (lesson.roomName || (rooms || []).find(r => r.id === lesson.roomId)?.name || 'Classroom (Unassigned)')
                                                            : (vehicles.find(v => v.id === lesson.vehicleId)?.plateNumber || 'N/A')
                                                        }
                                                    </td>
                                                    <td className="px-10 py-6 print:px-4 print:py-3">
                                                        <div className="flex flex-col gap-1.5 items-start">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest print:px-0 print:bg-transparent print:border-none ${
                                                                lesson.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 print:text-emerald-700' : 
                                                                lesson.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 print:text-rose-700' : 'bg-blue-50 text-blue-600 print:text-blue-700'
                                                            }`}>
                                                                {lesson.status}
                                                            </span>
                                                            {lesson.status !== 'Completed' && (
                                                                <div className="flex gap-1 mt-0.5 print:hidden">
                                                                    <button 
                                                                        onClick={() => onUpdateLesson?.({ ...lesson, status: 'Completed' })}
                                                                        className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded text-[8px] font-black uppercase tracking-wider transition-all"
                                                                        title="One-Click Validate Attendance"
                                                                    >
                                                                        ✔ Confirm
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => onUpdateLesson?.({ ...lesson, status: 'Cancelled' })}
                                                                        className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded text-[8px] font-black uppercase tracking-wider transition-all"
                                                                        title="Mark No-Show / Cancelled"
                                                                    >
                                                                        ❌ No-Show
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6 text-right print:hidden">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {lesson.status !== 'Completed' && (
                                                                <button
                                                                    onClick={() => setSelectedQRLesson(lesson)}
                                                                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all"
                                                                    title="Self-Service QR Check-in"
                                                                >
                                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h1v1h-1zM17 17h1v1h-1zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z"/></svg>
                                                                    QR Scan
                                                                </button>
                                                            )}
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
                                    {/* Pending Deletions Section */}
                                    {payments.filter(p => p.status === 'Pending Deletion').length > 0 && (
                                         <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-[3rem] p-8 mb-8 space-y-6">
                                             <div>
                                                 <h4 className="text-lg font-black text-amber-800 dark:text-amber-400 uppercase tracking-tight flex items-center gap-2">
                                                     <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                     Pending Deletion Requests
                                                 </h4>
                                                 <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest mt-1">
                                                     Awaiting director confirmation before full deletion
                                                 </p>
                                             </div>
                                             <div className="overflow-x-auto">
                                                 <table className="w-full text-left">
                                                     <thead>
                                                         <tr className="text-[9px] font-black uppercase tracking-widest text-amber-700/60 dark:text-amber-500/60 border-b border-amber-200/50 dark:border-amber-800/30">
                                                             <th className="px-6 py-4">Receipt #</th>
                                                             <th className="px-6 py-4">Student</th>
                                                             <th className="px-6 py-4">Amount</th>
                                                             <th className="px-6 py-4">Reason</th>
                                                             <th className="px-6 py-4">Requested By</th>
                                                             <th className="px-6 py-4 text-right">Actions</th>
                                                         </tr>
                                                     </thead>
                                                     <tbody className="divide-y divide-amber-200/30 dark:divide-amber-800/20">
                                                         {payments.filter(p => p.status === 'Pending Deletion').map(payment => (
                                                             <tr key={payment.id} className="hover:bg-amber-100/20">
                                                                 <td className="px-6 py-4 font-bold text-amber-900 dark:text-amber-300">{payment.receiptNumber}</td>
                                                                 <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{payment.studentName}</td>
                                                                 <td className="px-6 py-4 font-bold text-sm text-slate-900 dark:text-white">KES {payment.amount.toLocaleString()}</td>
                                                                 <td className="px-6 py-4 text-xs italic text-rose-600 dark:text-rose-400">{payment.deletionReason}</td>
                                                                 <td className="px-6 py-4 text-xs text-slate-500">{payment.deletionRequestedBy || 'Admin'}</td>
                                                                 <td className="px-6 py-4 text-right space-x-2">
                                                                     {isDirector ? (
                                                                         <>
                                                                             <button 
                                                                                 onClick={() => handleConfirmDeletion(payment.id)}
                                                                                 className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
                                                                             >
                                                                                 Confirm
                                                                             </button>
                                                                             <button 
                                                                                 onClick={() => handleRejectDeletion(payment.id)}
                                                                                 className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                                                                             >
                                                                                 Reject
                                                                             </button>
                                                                         </>
                                                                     ) : (
                                                                         <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded">
                                                                             Awaiting Director
                                                                         </span>
                                                                     )}
                                                                 </td>
                                                             </tr>
                                                         ))}
                                                     </tbody>
                                                 </table>
                                             </div>
                                         </div>
                                     )}
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Invoices</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage billing and student receivables</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-center justify-end">
                                        <button onClick={handleSendPdlExpiryAlerts} disabled={isSendingReminders} className="px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-800/40 disabled:opacity-50" title="Auto detect PDLs nearing 90-day expiry">
                                            <SparklesIcon className="w-3.5 h-3.5" />
                                            Expiring PDL Alerts
                                        </button>
                                        <button onClick={handleSendTestDayReminders} disabled={isSendingReminders} className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-1.5 border border-blue-200 dark:border-blue-800/40 disabled:opacity-50" title="Alert candidates exceeding 80% practical mastery">
                                            <SparklesIcon className="w-3.5 h-3.5" />
                                            Test Day Alerts
                                        </button>
                                        <button onClick={handleSendBulkReminders} disabled={isSendingReminders} className="px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-1.5 border border-amber-200 dark:border-amber-800/40 disabled:opacity-50">
                                            <PhoneIcon className="w-3.5 h-3.5" />
                                            {isSendingReminders ? 'Sending...' : 'Remind Balances'}
                                        </button>
                                        <button onClick={() => setActionModal({ type: 'payment' })} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-1.5">
                                            <CurrencyIcon className="w-3.5 h-3.5" />
                                            Record Payment
                                        </button>
                                        <button onClick={() => setActionModal({ type: 'invoice' })} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-1.5">
                                            <PlusIcon className="w-3.5 h-3.5" />
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
                                                                const student = (students || []).find(s => s.id === invoice.studentId);
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
                                                                const student = (students || []).find(s => s.id === invoice.studentId);
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
                                            {(filteredPayments || []).slice(0, 10).map(payment => (
                                                <tr key={payment.id} className="hover:bg-slate-50/50">
                                                    <td className="px-10 py-6 font-bold flex items-center gap-2">
                                                         <span>{payment.receiptNumber}</span>
                                                         {payment.status === 'Pending Deletion' && (
                                                             <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800/40">
                                                                 Pending Deletion
                                                             </span>
                                                         )}
                                                     </td>
                                                    <td className="px-10 py-6 text-sm">{payment.studentName}</td>
                                                    <td className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-indigo-600">{payment.paymentMethod}</td>
                                                    <td className="px-10 py-6 font-bold text-sm">KES {payment.amount.toLocaleString()}</td>
                                                    <td className="px-10 py-6 text-xs text-slate-500">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                                    <td className="px-10 py-6 text-right space-x-2">
                                                        <button 
                                                            onClick={async () => {
                                                                const student = (students || []).find(s => s.id === payment.studentId);
                                                                if (student) {
                                                                    const doc = await generateDSPDF('receipt', payment, student as any, settings, currentInstitution, invoices);
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
                                                                const student = (students || []).find(s => s.id === payment.studentId);
                                                                if (student) {
                                                                    const url = await generateDSThermalReceipt(payment, student as any, currentInstitution, false, invoices);
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
                                                        {isAdmin && payment.status !== 'Pending Deletion' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => setActionModal({ type: 'payment', initialData: payment })}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center"
                                                                    title="Edit Payment"
                                                                >
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRequestDeletion(payment.id)}
                                                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all inline-flex items-center"
                                                                    title="Delete Payment"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
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

                    {activeTab === 'portal' && (
                        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                                <div className="relative z-10">
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-100">Self-Service Kiosk</span>
                                    <h3 className="text-2xl font-black tracking-tight mt-3">Candidate Booking Portal</h3>
                                    <p className="text-xs text-indigo-100 mt-1 max-w-xl">
                                        Empower active candidates to view scheduling capacity, review live balance statuses, and seamlessly book individual theory or practical instructional slots.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm space-y-8">
                                {/* Step 1: Select Candidate */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">1. Identify Candidate Profile *</label>
                                    <select
                                        value={portalStudentId}
                                        onChange={(e) => {
                                            const sid = e.target.value;
                                            setPortalStudentId(sid);
                                            // Pre-select preferred instructor or default values if available
                                            const stud = (students || []).find(s => s.id === sid);
                                            if (stud && stud.preferredInstructorId) {
                                                setPortalInstructorId(stud.preferredInstructorId);
                                            }
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">-- Choose Candidate Account --</option>
                                        {(normalizedStudents || []).map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.fullName} ({s.admissionNumber || 'N/A'}) - {s.status}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {portalStudentId ? (() => {
                                    const selectedStudent = (normalizedStudents || []).find(s => s.id === portalStudentId);
                                    // Calculate financials
                                    const studentInvoices = (invoices || []).filter(inv => inv.studentId === portalStudentId && inv.status !== 'Fully Paid');
                                    const totalOwed = studentInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
                                    const hasFinancialLockout = totalOwed > 0;

                                    // Detect Overlaps
                                    const activeLessonsOnDate = (lessons || []).filter(l => 
                                        l.lessonDate && 
                                        l.status !== 'Cancelled' && 
                                        new Date(l.lessonDate).toISOString().split('T')[0] === portalLessonDate
                                    );

                                    const isOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
                                        if (!start1 || !end1 || !start2 || !end2) return false;
                                        return start1 < end2 && start2 < end1;
                                    };

                                    const instructorConflict = portalInstructorId ? activeLessonsOnDate.find(l => 
                                        l.instructorId === portalInstructorId && 
                                        isOverlapping(portalStartTime, portalEndTime, l.startTime, l.endTime)
                                    ) : null;

                                    const vehicleConflict = (portalLessonType !== 'Theory' && portalVehicleId) ? activeLessonsOnDate.find(l => 
                                        l.vehicleId === portalVehicleId && 
                                        isOverlapping(portalStartTime, portalEndTime, l.startTime, l.endTime)
                                    ) : null;

                                    return (
                                        <div className="space-y-8 animate-fade-in">
                                            {/* Candidate Fast Overview */}
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs uppercase">
                                                        {selectedStudent?.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">{selectedStudent?.fullName}</h5>
                                                        <p className="text-[10px] text-slate-400 font-medium">Category: <span className="text-indigo-600 font-bold">{selectedStudent?.licenseCategory || 'Standard'}</span></p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Fee Balance</span>
                                                    <span className={`text-xs font-black ${totalOwed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        KES {totalOwed.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Financial Lockout Alert Banner */}
                                            {hasFinancialLockout && (
                                                <div className="p-5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-2xl flex items-start gap-3">
                                                    <SparklesIcon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                                    <div className="space-y-1">
                                                        <h6 className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-tight">Financial Milestone Guidance Active</h6>
                                                        <p className="text-[11px] text-blue-700 dark:text-blue-300">
                                                            Your account carries an outstanding cumulative balance of <b>KES {totalOwed.toLocaleString()}</b>. Institutional protocols encourage prompt deposits before scheduling subsequent continuous advanced coaching blocks.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reservation Fields Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Target Type</label>
                                                    <select
                                                        value={portalLessonType}
                                                        onChange={(e) => setPortalLessonType(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-xs font-bold"
                                                    >
                                                        <option value="Practical">Practical Driver Coaching</option>
                                                        <option value="Theory">Theory & Signage Mastery</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Date</label>
                                                    <input
                                                        type="date"
                                                        value={portalLessonDate}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={(e) => setPortalLessonDate(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-xs font-bold"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time Interval</label>
                                                    <input
                                                        type="time"
                                                        value={portalStartTime}
                                                        onChange={(e) => setPortalStartTime(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-xs font-bold"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time Interval</label>
                                                    <input
                                                        type="time"
                                                        value={portalEndTime}
                                                        onChange={(e) => setPortalEndTime(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-xs font-bold"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign Coach / Instructor *</label>
                                                    <select
                                                        value={portalInstructorId}
                                                        onChange={(e) => setPortalInstructorId(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-xs font-bold"
                                                    >
                                                        <option value="">-- Select Available Instructor --</option>
                                                        {(normalizedInstructors || []).filter(i => i.status === 'Active').map(i => (
                                                            <option key={i.id} value={i.id}>{i.name} ({i.specialization || 'Master'})</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {portalLessonType !== 'Theory' ? (
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Allocate Operational Vehicle *</label>
                                                        <select
                                                            value={portalVehicleId}
                                                            onChange={(e) => setPortalVehicleId(e.target.value)}
                                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-xs font-bold"
                                                        >
                                                            <option value="">-- Select Active Fleet --</option>
                                                            {(vehicles || []).filter(v => v.status === 'Operational').map(v => (
                                                                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Designated Room / Location</label>
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value="Main Theory Center Class"
                                                            className="w-full bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-none rounded-xl py-3 px-4 text-xs font-bold cursor-not-allowed"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Instant Overlap Warning State Display */}
                                            {instructorConflict && (
                                                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center gap-3 text-rose-600 animate-shake">
                                                    <span className="font-black text-xs">⚠️</span>
                                                    <p className="text-[11px] font-medium">
                                                        <b>Instructor Collision Detected:</b> The selected coach is already leading a session from {instructorConflict.startTime} to {instructorConflict.endTime}.
                                                    </p>
                                                </div>
                                            )}

                                            {vehicleConflict && (
                                                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center gap-3 text-amber-700 animate-shake">
                                                    <span className="font-black text-xs">🚗</span>
                                                    <p className="text-[11px] font-medium">
                                                        <b>Vehicle Collision Detected:</b> This fleet vehicle is checked out for practical coaching from {vehicleConflict.startTime} to {vehicleConflict.endTime}.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Submit Request Button */}
                                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end">
                                                <button
                                                    type="button"
                                                    disabled={!portalInstructorId || (portalLessonType !== 'Theory' && !portalVehicleId) || !!instructorConflict || !!vehicleConflict}
                                                    onClick={async () => {
                                                        try {
                                                            const payload = {
                                                                id: `lsn_${Date.now()}`,
                                                                institutionId: currentInstitution?.id || 'inst',
                                                                studentId: portalStudentId,
                                                                instructorId: portalInstructorId,
                                                                vehicleId: portalLessonType !== 'Theory' ? portalVehicleId : undefined,
                                                                lessonDate: portalLessonDate,
                                                                startTime: portalStartTime,
                                                                endTime: portalEndTime,
                                                                status: 'Scheduled',
                                                                lessonType: portalLessonType,
                                                                notes: 'Self-Service Direct Reservation'
                                                            };
                                                            await onAddLesson(payload);
                                                            success?.("Successfully secured reservation slot!");
                                                            // Clear state parameters slightly to show confirmation refresh
                                                            setPortalStudentId('');
                                                        } catch (err) {
                                                            toastError?.("System error during self-service confirmation allocation.");
                                                        }
                                                    }}
                                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none disabled:scale-100 flex items-center gap-2"
                                                >
                                                    <span>Confirm & Secure Reservation</span>
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })() : (
                                    <div className="py-12 text-center">
                                        <p className="text-xs font-bold text-slate-400">Please choose a candidate identity from the roster above to initiate resource verification controls.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'broadcaster' && (
                        <div className="animate-fade-in">
                            <DSBroadcasterView onNewBroadcast={() => setActionModal({ type: 'broadcast' })} />
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="animate-fade-in">
                            <DSReportsView 
                                lessons={lessons}
                                instructors={normalizedInstructors}
                                students={normalizedStudents}
                                vehicles={vehicles}
                                rooms={rooms || []}
                                letterheadConfig={letterheadConfig}
                                currentInstitution={currentInstitution}
                            />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-fade-in space-y-8">
                            {/* Horizontal Sub-navigation Bar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
                                    {[
                                        { id: 'categories', label: 'License Categories', icon: AcademicCapIcon },
                                        { id: 'votes', label: 'Fee Votes / Heads', icon: CreditCardIcon },
                                        { id: 'rules', label: 'Scheduling Rules', icon: ClipboardListIcon },
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
                                    onClick={async () => {
                                        if (settingsDraft) {
                                            try {
                                                await onUpdateSettings(settingsDraft);
                                                success("Driving school settings updated successfully.");
                                            } catch (err) {
                                                console.error("Save settings error:", err);
                                                toastError("Failed to update settings.");
                                            }
                                        }
                                    }}
                                    className={`px-8 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap self-end md:self-auto ${
                                        hasUnsavedChanges 
                                        ? 'bg-indigo-600 animate-pulse ring-4 ring-indigo-500/35 shadow-indigo-600/40' 
                                        : 'bg-slate-900 dark:bg-indigo-600'
                                    }`}
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Save All Settings
                                </button>
                            </div>

                            {/* Settings Content Area */}
                            <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[500px] animate-fade-in overflow-hidden">
                                {settingsSubTab === 'categories' && (
                                    <div className="space-y-12 animate-fade-in">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">License Categories</h4>
                                            <p className="text-xs font-medium text-slate-400">Configure supported NTSA/Local driving license classifications and their standard base pricing.</p>
                                        </div>

                                        {/* Presets Block */}
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Quick Standard Presets</p>
                                            <div className="flex flex-wrap gap-2.5">
                                                {[
                                                    { code: 'A1', name: 'Light Passenger Craft (Moped)', baseFee: 6500, description: 'Up to 50cc lightweight motorcycles.' },
                                                    { code: 'B', name: 'Light Passenger Vehicle (Car)', baseFee: 15000, description: 'Standard light vehicles (Manual/Automatic).' },
                                                    { code: 'C1', name: 'Light Commercial Vehicle', baseFee: 18500, description: 'Commercial vehicle exceeding 3,500kg up to 7,500kg.' },
                                                    { code: 'C', name: 'Heavy Commercial Vehicle', baseFee: 22000, description: 'Large multi-axle freight trucks.' },
                                                    { code: 'E', name: 'Special Purpose Vehicle', baseFee: 25000, description: 'Tractors, heavy machinery, or specialized carriers.' }
                                                ].map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setNewCategoryInput({ ...preset, isActive: true })}
                                                        className="px-5 py-3 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700/60 shadow-xs hover:border-indigo-200 transition-all flex items-center gap-2"
                                                    >
                                                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-md font-black text-[10px]">{preset.code}</span>
                                                        {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Add Category Form */}
                                        <div className="p-8 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-900/20 space-y-6">
                                            <div className="flex items-center gap-2">
                                                <PlusIcon className="w-4 h-4 text-indigo-600" />
                                                <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Register License Category</h5>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Code *</label>
                                                    <input 
                                                        type="text" 
                                                        value={newCategoryInput.code}
                                                        onChange={e => setNewCategoryInput({ ...newCategoryInput, code: e.target.value.toUpperCase() })}
                                                        placeholder="e.g. B"
                                                        className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name *</label>
                                                    <input 
                                                        type="text" 
                                                        value={newCategoryInput.name}
                                                        onChange={e => setNewCategoryInput({ ...newCategoryInput, name: e.target.value })}
                                                        placeholder="e.g. Light Passenger Vehicle"
                                                        className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Course Fee (KES)</label>
                                                    <input 
                                                        type="number" 
                                                        value={newCategoryInput.baseFee || ''}
                                                        onChange={e => setNewCategoryInput({ ...newCategoryInput, baseFee: parseFloat(e.target.value) || 0 })}
                                                        placeholder="e.g. 15000"
                                                        className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description Scope</label>
                                                <input 
                                                    type="text" 
                                                    value={newCategoryInput.description}
                                                    onChange={e => setNewCategoryInput({ ...newCategoryInput, description: e.target.value })}
                                                    placeholder="e.g. Standard saloons and hatchbacks capacity up to 7 passengers."
                                                    className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!newCategoryInput.code.trim() || !newCategoryInput.name.trim()) {
                                                        toastError("Category code and name are mandatory.");
                                                        return;
                                                    }
                                                    const existingCats = settings?.licenseCategories || [];
                                                    const filtered = existingCats.filter(c => c.code !== newCategoryInput.code.trim());
                                                    const updated = [...filtered, { 
                                                        id: `cat_${Date.now()}`,
                                                        code: newCategoryInput.code.trim(),
                                                        name: newCategoryInput.name.trim(),
                                                        description: newCategoryInput.description.trim(),
                                                        baseFee: newCategoryInput.baseFee,
                                                        isActive: newCategoryInput.isActive
                                                    }];
                                                    onUpdateSettings({ ...settings, licenseCategories: updated });
                                                    setNewCategoryInput({ code: '', name: '', description: '', baseFee: 0, isActive: true });
                                                    success("License category appended successfully.");
                                                }}
                                                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                                            >
                                                Add / Update Category
                                            </button>
                                        </div>

                                        {/* Categories List View */}
                                        <div className="space-y-4">
                                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Active Classifications ({settings?.licenseCategories?.length || 0})</h5>
                                            {(settings?.licenseCategories || []).length === 0 ? (
                                                <p className="p-8 text-center text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed">No driving license categories configured yet. Use presets above to instantiate.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {(settings?.licenseCategories || []).map(cat => (
                                                        <div key={cat.id} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-start justify-between gap-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-black text-xs">{cat.code}</span>
                                                                    <h6 className="font-bold text-sm text-slate-900 dark:text-white">{cat.name}</h6>
                                                                </div>
                                                                {cat.description && <p className="text-xs text-slate-500">{cat.description}</p>}
                                                                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-2">KES {(cat.baseFee ?? (cat as any).base_fee ?? 0).toLocaleString()}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = (settings?.licenseCategories || []).filter(c => c.id !== cat.id);
                                                                    onUpdateSettings({ ...settings, licenseCategories: updated });
                                                                }}
                                                                className="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {settingsSubTab === 'votes' && (
                                    <div className="space-y-12 animate-fade-in">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Fee Votes / Heads</h4>
                                            <p className="text-xs font-medium text-slate-400">Manage configurable billing items and mandatory assessment fees added to student fee projections.</p>
                                        </div>

                                        {/* Presets Block */}
                                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Standard Institutional Fee Heads</p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const presets = [
                                                            { voteName: 'Tuition Fee', defaultAmount: 12000, isMandatory: true },
                                                            { voteName: 'Registration Fee', defaultAmount: 1500, isMandatory: true },
                                                            { voteName: 'NTSA Test Booking Fee', defaultAmount: 3500, isMandatory: true },
                                                            { voteName: 'Driving Assessment Fee', defaultAmount: 2000, isMandatory: false },
                                                            { voteName: 'First Aid Training Fee', defaultAmount: 1000, isMandatory: false },
                                                            { voteName: 'Student ID & Logbook', defaultAmount: 800, isMandatory: false }
                                                        ];
                                                        setBulkVotesEntries(prev => {
                                                            const filtered = prev.filter(p => p.voteName.trim() !== '');
                                                            const newStaged = [...filtered];
                                                            presets.forEach(pr => {
                                                                if (!newStaged.some(s => s.voteName.toLowerCase() === pr.voteName.toLowerCase())) {
                                                                    newStaged.push({ ...pr });
                                                                }
                                                            });
                                                            return newStaged.length > 0 ? newStaged : [{ voteName: '', defaultAmount: 0, isMandatory: false }];
                                                        });
                                                        success("All institutional presets appended to staging manager.");
                                                    }}
                                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black text-[10px] rounded-xl uppercase tracking-wider hover:bg-indigo-100 transition-all self-start sm:self-auto"
                                                >
                                                    ⚡ Stage All Presets
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
                                                {[
                                                    { voteName: 'Tuition Fee', defaultAmount: 12000, isMandatory: true },
                                                    { voteName: 'Registration Fee', defaultAmount: 1500, isMandatory: true },
                                                    { voteName: 'NTSA Test Booking Fee', defaultAmount: 3500, isMandatory: true },
                                                    { voteName: 'Driving Assessment Fee', defaultAmount: 2000, isMandatory: false },
                                                    { voteName: 'First Aid Training Fee', defaultAmount: 1000, isMandatory: false },
                                                    { voteName: 'Student ID & Logbook', defaultAmount: 800, isMandatory: false }
                                                ].map((preset, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setBulkVotesEntries(prev => {
                                                                const filtered = prev.filter(p => p.voteName.trim() !== '');
                                                                if (filtered.some(s => s.voteName.toLowerCase() === preset.voteName.toLowerCase())) {
                                                                    return prev;
                                                                }
                                                                return [...filtered, { ...preset }];
                                                            });
                                                            success(`Staged "${preset.voteName}".`);
                                                        }}
                                                        className="px-5 py-3 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700/60 shadow-xs hover:border-indigo-200 transition-all flex items-center gap-2"
                                                    >
                                                        {preset.isMandatory && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                                                        {preset.voteName}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dynamic Bulk Registration Interface */}
                                        <div className="p-8 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-900/20 space-y-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    <PlusIcon className="w-4 h-4 text-indigo-600" />
                                                    <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Dynamic Multiple Votes Entry Staging</h5>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBulkVotesEntries(prev => [...prev, { voteName: '', defaultAmount: 0, isMandatory: false }]);
                                                    }}
                                                    className="px-4 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all"
                                                >
                                                    + Add Row
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                {bulkVotesEntries.map((row, index) => (
                                                    <div key={index} className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
                                                        <div className="w-full md:w-5/12 space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block md:hidden">Fee Head Name</label>
                                                            <input 
                                                                type="text" 
                                                                value={row.voteName}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setBulkVotesEntries(prev => prev.map((r, i) => i === index ? { ...r, voteName: val } : r));
                                                                }}
                                                                placeholder="Fee Head Name (e.g. Tuition Fee)"
                                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                                                            />
                                                        </div>
                                                        <div className="w-full md:w-4/12 space-y-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block md:hidden">Default Amount</label>
                                                            <input 
                                                                type="number" 
                                                                value={row.defaultAmount || ''}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setBulkVotesEntries(prev => prev.map((r, i) => i === index ? { ...r, defaultAmount: val } : r));
                                                                }}
                                                                placeholder="Amount (KES)"
                                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                                                            />
                                                        </div>
                                                        <div className="w-full md:w-2/12 flex items-center justify-between md:justify-center pt-2 md:pt-0">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={row.isMandatory}
                                                                    onChange={e => {
                                                                        const checked = e.target.checked;
                                                                        setBulkVotesEntries(prev => prev.map((r, i) => i === index ? { ...r, isMandatory: checked } : r));
                                                                    }}
                                                                    className="w-4 h-4 rounded text-indigo-600"
                                                                />
                                                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase">Mandatory</span>
                                                            </label>
                                                        </div>
                                                        <div className="w-full md:w-1/12 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setBulkVotesEntries(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ voteName: '', defaultAmount: 0, isMandatory: false }]);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBulkVotesEntries([{ voteName: '', defaultAmount: 0, isMandatory: false }]);
                                                    }}
                                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-all"
                                                >
                                                    Clear Staging Form
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const validEntries = bulkVotesEntries.filter(b => b.voteName.trim() !== '');
                                                        if (validEntries.length === 0) {
                                                            toastError("Please enter at least one valid fee vote name.");
                                                            return;
                                                        }
                                                        try {
                                                            const existingVotes = settings?.votes || [];
                                                            const existingMap = new Map();
                                                            existingVotes.forEach(ev => {
                                                                const n = ev.voteName || (ev as any).vote_name;
                                                                if (n) existingMap.set(n.toLowerCase().trim(), ev);
                                                            });
                                                            validEntries.forEach((ve, vIdx) => {
                                                                existingMap.set(ve.voteName.toLowerCase().trim(), {
                                                                    id: `vt_${Date.now()}_${vIdx}_${Math.random().toString(36).substring(2, 6)}`,
                                                                    institutionId: currentInstitution?.id || 'inst',
                                                                    voteName: ve.voteName.trim(),
                                                                    defaultAmount: ve.defaultAmount,
                                                                    isMandatory: ve.isMandatory
                                                                });
                                                            });
                                                            const updated = Array.from(existingMap.values());
                                                            const payload = { ...settings, id: settings?.id || `ds_settings_${currentInstitution?.id}`, institutionId: currentInstitution?.id || 'inst', votes: updated };
                                                            
                                                            console.log("[DS Manager] Bulk Save Votes initiated. Payload:", payload);
                                                            await onUpdateSettings(payload);
                                                            setBulkVotesEntries([{ voteName: '', defaultAmount: 0, isMandatory: false }]);
                                                            success(`Successfully persisted ${validEntries.length} fee heads.`);
                                                            if (onRefreshDataProp) {
                                                                await onRefreshDataProp();
                                                            }
                                                        } catch (err) {
                                                            console.error("[DS Manager] Bulk save error:", err);
                                                            toastError("Database rejection during bulk multiple entry commit.");
                                                        }
                                                    }}
                                                    className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                                                >
                                                    🚀 Bulk Register Staged Votes ({bulkVotesEntries.filter(b => b.voteName.trim() !== '').length})
                                                </button>
                                            </div>
                                        </div>

                                        {/* Votes List View */}
                                        <div className="space-y-4">
                                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Configured Fee Heads ({settings?.votes?.length || 0})</h5>
                                            {(settings?.votes || []).length === 0 ? (
                                                <p className="p-8 text-center text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed">No fee heads configured yet. Click standard institutional presets above to initialize.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {(settings?.votes || []).map(vt => {
                                                        const isEditing = editingVoteId === vt.id;
                                                        const vName = vt.voteName || (vt as any).vote_name || '';
                                                        const vAmount = vt.defaultAmount ?? (vt as any).default_amount ?? 0;
                                                        const vMandatory = vt.isMandatory ?? (vt as any).is_mandatory ?? false;
                                                        
                                                        return (
                                                            <div key={vt.id} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4">
                                                                {isEditing ? (
                                                                    <div className="space-y-3 w-full">
                                                                        <input 
                                                                            type="text" 
                                                                            value={editingVotePayload.voteName}
                                                                            onChange={e => setEditingVotePayload({ ...editingVotePayload, voteName: e.target.value })}
                                                                            placeholder="Fee Head Name"
                                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                                                                        />
                                                                        <input 
                                                                            type="number" 
                                                                            value={editingVotePayload.defaultAmount}
                                                                            onChange={e => setEditingVotePayload({ ...editingVotePayload, defaultAmount: parseFloat(e.target.value) || 0 })}
                                                                            placeholder="Amount (KES)"
                                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                                                                        />
                                                                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={editingVotePayload.isMandatory}
                                                                                onChange={e => setEditingVotePayload({ ...editingVotePayload, isMandatory: e.target.checked })}
                                                                                className="w-4 h-4 rounded text-indigo-600"
                                                                            />
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase">Mandatory</span>
                                                                        </label>
                                                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditingVoteId(null)}
                                                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                                                                title="Cancel"
                                                                            >
                                                                                <XIcon className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    if (!editingVotePayload.voteName.trim()) {
                                                                                        toastError("Fee head name cannot be empty.");
                                                                                        return;
                                                                                    }
                                                                                    try {
                                                                                        const updatedVotes = (settings?.votes || []).map(v => v.id === vt.id ? { ...v, voteName: editingVotePayload.voteName.trim(), defaultAmount: editingVotePayload.defaultAmount, isMandatory: editingVotePayload.isMandatory } : v);
                                                                                        const payload = { ...settings, id: settings?.id || `ds_settings_${currentInstitution?.id}`, institutionId: currentInstitution?.id || 'inst', votes: updatedVotes };
                                                                                        await onUpdateSettings(payload);
                                                                                        setEditingVoteId(null);
                                                                                        success("Fee vote updated successfully.");
                                                                                        if (onRefreshDataProp) await onRefreshDataProp();
                                                                                    } catch (err) {
                                                                                        console.error("Update vote error:", err);
                                                                                        toastError("Failed to update fee vote.");
                                                                                    }
                                                                                }}
                                                                                className="p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all"
                                                                                title="Save Changes"
                                                                            >
                                                                                <CheckCircleIcon className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="space-y-1 flex-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <h6 className="font-bold text-sm text-slate-900 dark:text-white">{vName}</h6>
                                                                                {vMandatory && <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded text-[9px] font-black uppercase">Mandatory</span>}
                                                                            </div>
                                                                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-2">KES {vAmount.toLocaleString()}</p>
                                                                        </div>
                                                                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-50 dark:border-slate-800/50 mt-auto">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingVoteId(vt.id);
                                                                                    setEditingVotePayload({ voteName: vName, defaultAmount: vAmount, isMandatory: vMandatory });
                                                                                }}
                                                                                className="p-2 text-slate-300 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                                                title="Edit Fee Head"
                                                                            >
                                                                                <PencilIcon className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        const updated = (settings?.votes || []).filter(v => v.id !== vt.id);
                                                                                        const payload = { ...settings, id: settings?.id || `ds_settings_${currentInstitution?.id}`, institutionId: currentInstitution?.id || 'inst', votes: updated };
                                                                                        await onUpdateSettings(payload);
                                                                                        success("Fee vote removed successfully.");
                                                                                        if (onRefreshDataProp) await onRefreshDataProp();
                                                                                    } catch (err) {
                                                                                        console.error("Delete vote error:", err);
                                                                                        toastError("Database rejection: Could not remove Vote Head.");
                                                                                    }
                                                                                }}
                                                                                className="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                                                title="Delete Fee Head"
                                                                            >
                                                                                <TrashIcon className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {settingsSubTab === 'rules' && (
                                    <div className="space-y-12 animate-fade-in">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Scheduling Rules</h4>
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
                                                    const isSelected = JSON.stringify(activeSettings?.schedulingRules?.dailySequence) === JSON.stringify(seq.value);
                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => setSettingsDraft({
                                                                ...activeSettings,
                                                                schedulingRules: {
                                                                    ...(activeSettings?.schedulingRules || {}),
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
                                                    value={activeSettings?.schedulingRules?.requiredDaysToComplete || ''} 
                                                    onChange={e => setSettingsDraft({ 
                                                        ...activeSettings, 
                                                        schedulingRules: { 
                                                            ...(activeSettings?.schedulingRules || {}), 
                                                            requiredDaysToComplete: parseInt(e.target.value) || 0 
                                                        } 
                                                    })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
                                                    placeholder="e.g. 21"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Theory Duration (Mins)</label>
                                                <input 
                                                    type="number" 
                                                    value={activeSettings?.schedulingRules?.theoryDurationMinutes || ''} 
                                                    onChange={e => setSettingsDraft({ 
                                                        ...activeSettings, 
                                                        schedulingRules: { 
                                                            ...(activeSettings?.schedulingRules || {}), 
                                                            theoryDurationMinutes: parseInt(e.target.value) || 0 
                                                        } 
                                                    })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Practical Duration (Mins)</label>
                                                <input 
                                                    type="number" 
                                                    value={activeSettings?.schedulingRules?.practicalDurationMinutes || ''} 
                                                    onChange={e => setSettingsDraft({ 
                                                        ...activeSettings, 
                                                        schedulingRules: { 
                                                            ...(activeSettings?.schedulingRules || {}), 
                                                            practicalDurationMinutes: parseInt(e.target.value) || 0 
                                                        } 
                                                    })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto-Generation Time</label>
                                                <input 
                                                    type="time" 
                                                    value={activeSettings?.schedulingRules?.nextDayAutoGenerationTime || ''} 
                                                    onChange={e => setSettingsDraft({ 
                                                        ...activeSettings, 
                                                        schedulingRules: { 
                                                            ...(activeSettings?.schedulingRules || {}), 
                                                            nextDayAutoGenerationTime: e.target.value 
                                                        } 
                                                    })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
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
                                                    checked={activeSettings?.schedulingRules?.allowBackToBackLessons || false}
                                                    onChange={e => setSettingsDraft({ 
                                                        ...activeSettings, 
                                                        schedulingRules: { 
                                                            ...(activeSettings?.schedulingRules || {}), 
                                                            allowBackToBackLessons: e.target.checked 
                                                        } 
                                                    })}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {/* SMS Notification & Reminder Rules Section */}
                                        <div className="border-t border-slate-100 dark:border-slate-800 pt-10 space-y-8">
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">SMS Notification & Reminder Rules</h4>
                                                <p className="text-xs font-medium text-slate-400">Configure automated messaging rules for lesson alerts, NTSA PDL expiries, and assessment schedules.</p>
                                            </div>

                                            {/* Lesson Reminders */}
                                            <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="max-w-md">
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Lesson SMS Reminders</p>
                                                        <p className="text-[10px] text-slate-500 font-medium mt-1">Automatically send SMS alerts to students and instructors for scheduled lessons.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer scale-125">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer"
                                                            checked={activeSettings?.schedulingRules?.enableSmsReminders || false}
                                                            onChange={e => setSettingsDraft({ 
                                                                ...activeSettings, 
                                                                schedulingRules: { 
                                                                    ...(activeSettings?.schedulingRules || {}), 
                                                                    enableSmsReminders: e.target.checked 
                                                                } 
                                                            })}
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>

                                                {activeSettings?.schedulingRules?.enableSmsReminders && (
                                                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Send Reminder Hours Before</label>
                                                            <input 
                                                                type="number" 
                                                                value={activeSettings?.schedulingRules?.smsReminderHours || 2} 
                                                                onChange={e => setSettingsDraft({ 
                                                                    ...activeSettings, 
                                                                    schedulingRules: { 
                                                                        ...(activeSettings?.schedulingRules || {}), 
                                                                        smsReminderHours: parseInt(e.target.value) || 0 
                                                                    } 
                                                                })}
                                                                className="w-full px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
                                                                placeholder="e.g. 2"
                                                            />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center ml-1">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lesson Reminder Template</label>
                                                                <span className="text-[8px] text-indigo-500 font-bold uppercase">Supported tags: {"{student}"}, {"{school}"}, {"{instructor}"}, {"{time}"}, {"{date}"}</span>
                                                            </div>
                                                            <textarea 
                                                                value={activeSettings?.schedulingRules?.smsReminderTemplate || ''} 
                                                                onChange={e => setSettingsDraft({ 
                                                                    ...activeSettings, 
                                                                    schedulingRules: { 
                                                                        ...(activeSettings?.schedulingRules || {}), 
                                                                        smsReminderTemplate: e.target.value 
                                                                    } 
                                                                })}
                                                                className="w-full px-8 py-4 min-h-[100px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100 text-xs"
                                                                placeholder="Reminder: Your {school} lesson with {instructor} starts at {time}. Be ready!"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* PDL Expiry Warnings */}
                                            <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="max-w-md">
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">PDL Expiry Alerts</p>
                                                        <p className="text-[10px] text-slate-500 font-medium mt-1">Enable auto-filtering and customized messages for NTSA PDL expiry warning broadcasts.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer scale-125">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer"
                                                            checked={activeSettings?.schedulingRules?.enablePdlExpiryAlerts || false}
                                                            onChange={e => setSettingsDraft({ 
                                                                ...activeSettings, 
                                                                schedulingRules: { 
                                                                    ...(activeSettings?.schedulingRules || {}), 
                                                                    enablePdlExpiryAlerts: e.target.checked 
                                                                } 
                                                            })}
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>

                                                {activeSettings?.schedulingRules?.enablePdlExpiryAlerts && (
                                                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Warning Threshold (Days Enrolled)</label>
                                                            <input 
                                                                type="number" 
                                                                value={activeSettings?.schedulingRules?.pdlExpiryDaysThreshold || 75} 
                                                                onChange={e => setSettingsDraft({ 
                                                                    ...activeSettings, 
                                                                    schedulingRules: { 
                                                                        ...(activeSettings?.schedulingRules || {}), 
                                                                        pdlExpiryDaysThreshold: parseInt(e.target.value) || 0 
                                                                    } 
                                                                })}
                                                                className="w-full px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
                                                                placeholder="e.g. 75"
                                                            />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center ml-1">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PDL Expiry Warning Template</label>
                                                                <span className="text-[8px] text-indigo-500 font-bold uppercase">Supported tags: {"{student}"}, {"{fullName}"}, {"{course}"}</span>
                                                            </div>
                                                            <textarea 
                                                                value={activeSettings?.schedulingRules?.pdlExpirySmsTemplate || ''} 
                                                                onChange={e => setSettingsDraft({ 
                                                                    ...activeSettings, 
                                                                    schedulingRules: { 
                                                                        ...(activeSettings?.schedulingRules || {}), 
                                                                        pdlExpirySmsTemplate: e.target.value 
                                                                    } 
                                                                })}
                                                                className="w-full px-8 py-4 min-h-[100px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100 text-xs"
                                                                placeholder="Hello {student}, your NTSA PDL assigned to {course} is nearing its 90-day regulatory expiry. Please contact the front desk to arrange test assessment booking."
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Test Day Alerts */}
                                            <div className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="max-w-md">
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Test Day preparation Alerts</p>
                                                        <p className="text-[10px] text-slate-500 font-medium mt-1">Auto-alert candidates when they reach target practical mastery milestone.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer scale-125">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer"
                                                            checked={activeSettings?.schedulingRules?.enableTestDayAlerts || false}
                                                            onChange={e => setSettingsDraft({ 
                                                                ...activeSettings, 
                                                                schedulingRules: { 
                                                                    ...(activeSettings?.schedulingRules || {}), 
                                                                    enableTestDayAlerts: e.target.checked 
                                                                } 
                                                            })}
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>

                                                {activeSettings?.schedulingRules?.enableTestDayAlerts && (
                                                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mastery Progress Threshold (%)</label>
                                                            <input 
                                                                type="number" 
                                                                value={activeSettings?.schedulingRules?.testDayProgressThreshold || 80} 
                                                                onChange={e => setSettingsDraft({ 
                                                                    ...activeSettings, 
                                                                    schedulingRules: { 
                                                                        ...(activeSettings?.schedulingRules || {}), 
                                                                        testDayProgressThreshold: parseInt(e.target.value) || 0 
                                                                    } 
                                                                })}
                                                                className="w-full px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
                                                                placeholder="e.g. 80"
                                                            />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center ml-1">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Day Warning Template</label>
                                                                <span className="text-[8px] text-indigo-500 font-bold uppercase">Supported tags: {"{student}"}, {"{fullName}"}, {"{progress}"}</span>
                                                            </div>
                                                            <textarea 
                                                                value={activeSettings?.schedulingRules?.testDaySmsTemplate || ''} 
                                                                onChange={e => setSettingsDraft({ 
                                                                    ...activeSettings, 
                                                                    schedulingRules: { 
                                                                        ...(activeSettings?.schedulingRules || {}), 
                                                                        testDaySmsTemplate: e.target.value 
                                                                    } 
                                                                })}
                                                                className="w-full px-8 py-4 min-h-[100px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100 text-xs"
                                                                placeholder="Hello {student}, congratulations on reaching {progress}% practical mastery! Please submit your passport photos and original ID for final NTSA Test booking routing."
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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
                                                    value={activeSettings?.invoicePrefix || ''} 
                                                    onChange={e => setSettingsDraft({ ...activeSettings, invoicePrefix: e.target.value })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
                                                    placeholder="INV-"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Prefix</label>
                                                <input 
                                                    type="text" 
                                                    value={activeSettings?.receiptPrefix || ''} 
                                                    onChange={e => setSettingsDraft({ ...activeSettings, receiptPrefix: e.target.value })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
                                                    placeholder="REC-"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student ID Prefix</label>
                                                <input 
                                                    type="text" 
                                                    value={activeSettings?.studentIdPrefix || ''} 
                                                    onChange={e => setSettingsDraft({ ...activeSettings, studentIdPrefix: e.target.value })}
                                                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-slate-100"
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
                                                    <p className="text-[10px] font-medium text-slate-400 mb-3">{fee.items?.length || 0} Fee items included</p>
                                                    {Array.isArray(fee.items) && fee.items.length > 0 && (
                                                        <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-700/50 pt-3 select-none">
                                                            {fee.items.map((item: any, i: number) => (
                                                                <div key={i} className="flex items-center justify-between text-[11px]">
                                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{item.name || item.voteName || item.vote_name}</span>
                                                                    <span className="text-slate-700 dark:text-slate-300 font-bold">KES {(item.amount ?? item.defaultAmount ?? 0).toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
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
                                                const slot = (activeSettings?.lessonSlots || []).find((s: any) => s.type === period) || { type: period, startTime: '08:00', endTime: '10:00' };
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
                                                                        const nextSlots = (activeSettings?.lessonSlots || []).filter((s: any) => s.type !== period);
                                                                        setSettingsDraft({ ...activeSettings, lessonSlots: [...nextSlots, { ...slot, type: period as any, startTime: e.target.value }] });
                                                                    }}
                                                                    className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End</label>
                                                                <input 
                                                                    type="time" 
                                                                    value={slot.endTime}
                                                                    onChange={e => {
                                                                        const nextSlots = (activeSettings?.lessonSlots || []).filter((s: any) => s.type !== period);
                                                                        setSettingsDraft({ ...activeSettings, lessonSlots: [...nextSlots, { ...slot, type: period as any, endTime: e.target.value }] });
                                                                    }}
                                                                    className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"
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
                        initialData={actionModal.initialData}
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
                            else if (type === 'lesson') {
                                if (data.id) await onUpdateLesson(data);
                                else await onAddLesson(data);
                            }
                            else if (type === 'lead') {
                                if (data.id) await updateLead(data);
                                else await addLead(data);
                            }
                            else if (type === 'invoice') await onAddInvoice(data);
                            else if (type === 'payment') {
                                if (data.id) await onUpdatePayment(data);
                                else await onAddPayment(data);
                            }
                            else if (type === 'fee_structure') {
                                const dynamicItems = Array.isArray(data.items) ? data.items : [
                                    { name: 'Tuition Fee', amount: data.tuition || 0, priority: data.tuitionPriority || 1 },
                                    { name: 'PDL', amount: data.pdl || 0, priority: data.pdlPriority || 2 },
                                    { name: 'Assessment', amount: data.assessment || 0, priority: data.assessmentPriority || 3 }
                                ];
                                const calculatedTotal = dynamicItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
                                
                                const feeData = {
                                    id: data.id || `fee_${Date.now()}`,
                                    institutionId: currentInstitution?.id || '',
                                    className: data.className,
                                    description: data.description || `${data.className} Premium Package`,
                                    items: dynamicItems,
                                    totalAmount: calculatedTotal,
                                    updatedAt: new Date().toISOString()
                                };

                                let nextStructures = [...(settings?.feeStructures || [])];
                                if (data.id) {
                                    nextStructures = nextStructures.map(f => f.id === data.id ? { ...f, ...feeData } : f);
                                } else {
                                    nextStructures.push({ ...feeData, createdAt: new Date().toISOString() } as any);
                                }

                                // Simultaneously sync these items back into global Vote Heads configuration
                                const existingVotes = settings?.votes || [];
                                const votesMap = new Map();
                                existingVotes.forEach((ev: any) => {
                                    const n = ev.voteName || ev.vote_name;
                                    if (n) votesMap.set(n.toLowerCase().trim(), ev);
                                });

                                dynamicItems.forEach((it: any, vIdx: number) => {
                                    if (it.name && it.name.trim()) {
                                        const key = it.name.toLowerCase().trim();
                                        const existing = votesMap.get(key);
                                        votesMap.set(key, {
                                            id: existing?.id || `vt_${Date.now()}_${vIdx}_${Math.random().toString(36).substring(2, 6)}`,
                                            institutionId: currentInstitution?.id || 'inst',
                                            voteName: it.name.trim(),
                                            defaultAmount: Number(it.amount) || existing?.defaultAmount || (existing as any)?.default_amount || 0,
                                            isMandatory: existing?.isMandatory ?? existing?.is_mandatory ?? true
                                        });
                                    }
                                });
                                const updatedVotes = Array.from(votesMap.values());

                                const next = {
                                    ...(settings || {}),
                                    feeStructures: nextStructures,
                                    votes: updatedVotes
                                };
                                await onUpdateSettings(next);
                            } else if (type === 'broadcast') {
                                setIsActionLoading(true);
                                try {
                                    const targetUsers = data.target === 'Students' ? (students || []) : 
                                                       data.target === 'Instructors' ? (instructors || []) : 
                                                       data.target === 'Staff' ? (users || []).filter((u: User) => u.role !== 'student') : 
                                                       [...(students || []), ...(instructors || [])];

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
                                    let smsResInfo: any = null;
                                    const currentBalance = currentInstitution?.smsBalance || 0;

                                    if (phones.length > 0) {
                                        if (currentBalance < phones.length) {
                                            toastError(`Insufficient SMS Units! Required: ${phones.length}, Available: ${currentBalance}. Please top up.`);
                                            setIsActionLoading(false);
                                            return;
                                        }
                                        // Await SMS dispatch to capture precise delivery metadata
                                        smsResInfo = await apiService.sendSms(phones, `${priorityPrefix}${data.title}: ${data.message}`, currentInstitution?.smsConfig, 1, currentInstitution?.id);
                                    }

                                    if (emails.length > 0) {
                                        // We send emails in parallel to avoid sequential delay
                                        tasks.push(...emails.map(email => apiService.sendEmail(email, `${priorityPrefix}${data.title}`, data.message)));
                                    }

                                    await Promise.all(tasks);

                                    let deliverySummary = `Broadcast dispatched to ${targetUsers.length} recipients.`;
                                    if (phones.length > 0) {
                                        const remainingBalance = Math.max(0, currentBalance - phones.length);
                                        deliverySummary += ` SMS Delivery: dispatched to ${phones.length} destination numbers. Remaining Units: ${remainingBalance}.`;
                                        if (smsResInfo?.message) {
                                            deliverySummary += ` Gateway Status: ${smsResInfo.message}`;
                                        }
                                    }
                                    success(deliverySummary);
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
                        departments={departments}
                        rooms={rooms || []}
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

                {reasonModal.isOpen && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {reasonModal.type === 'delete' ? 'Confirm Deletion' : 'Confirm Edit'}
                                </h4>
                                <button type="button" onClick={() => setReasonModal({ ...reasonModal, isOpen: false })} className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition-all">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const reasonInput = (e.currentTarget.elements.namedItem('reason') as HTMLTextAreaElement).value;
                                if (!reasonInput.trim()) return;
                                if (reasonModal.onSubmit) {
                                    await reasonModal.onSubmit(reasonInput.trim());
                                }
                                setReasonModal({ ...reasonModal, isOpen: false });
                            }} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Reason for ${reasonModal.type === 'delete' ? 'Deletion' : 'Edit'} *
                                    </label>
                                    <textarea 
                                        required 
                                        name="reason" 
                                        rows={3} 
                                        placeholder={reasonModal.type === 'delete' ? "Explain why this payment record needs to be deleted..." : "Explain what is changing and why..."} 
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-900 dark:text-slate-100 resize-none"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setReasonModal({ ...reasonModal, isOpen: false })} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
                                    <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                        Confirm
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
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

                {selectedQRLesson && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-8 relative flex flex-col items-center text-center">
                            <button 
                                onClick={() => setSelectedQRLesson(null)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full bg-slate-50 dark:bg-slate-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h1v1h-1zM17 17h1v1h-1zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z"/></svg>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Attendance QR</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-6">Scan with phone camera to instantly verify attendance</p>
                            
                            {/* Visual Dynamic QR Representation using premium CSS Grid/SVG to ensure high-fidelity without binary compile failures */}
                            <div className="p-4 bg-white rounded-2xl border-4 border-slate-900 shadow-inner flex items-center justify-center relative group">
                                <svg className="w-48 h-48" viewBox="0 0 29 29" shapeRendering="crispEdges">
                                    <path fill="#0f172a" d="M0 0h7v7H0zM22 0h7v7h-7zM0 22h7v7H0zM2 2h3v3H2zM24 2h3v3h-3zM2 24h3v3H2zM8 0h2v1H8zM11 0h1v1h-1zM13 0h3v1h-3zM18 0h3v1h-3zM8 1h1v1H8zM10 1h2v1h-2zM13 1h2v1h-2zM16 1h5v1h-5zM8 2h3v1H8zM12 2h1v1h-1zM14 2h1v1h-1zM17 2h1v1h-1zM19 2h2v1h-2zM8 3h1v1H8zM11 3h2v1h-2zM14 3h3v1h-3zM18 3h1v1h-1zM20 3h1v1h-1zM8 4h3v1H8zM12 4h4v1h-4zM17 4h1v1h-1zM19 4h2v1h-2zM8 5h2v1H8zM11 5h1v1h-1zM14 5h3v1h-3zM18 5h1v1h-1zM20 5h1v1h-1zM8 6h5v1H8zM15 6h2v1h-2zM18 6h3v1h-3zM0 8h1v2H0zM2 8h1v1H2zM4 8h1v1H4zM6 8h2v1H6zM9 8h2v1H9zM12 8h1v1h-1zM15 8h3v1h-3zM19 8h1v1h-1zM21 8h1v1h-1zM23 8h2v1h-2zM26 8h3v1h-3zM0 10h2v1H0zM3 10h1v1H3zM5 10h2v1H5zM8 10h1v1H8zM10 10h1v1h-1zM12 10h3v1h-3zM16 10h2v1h-2zM19 10h1v1h-1zM21 10h1v1h-1zM23 10h1v1h-1zM25 10h1v1h-1zM27 10h2v1h-2zM0 12h1v1H0zM2 12h2v1H2zM5 12h1v1H5zM7 12h3v1H7zM11 12h1v1h-1zM13 12h2v1h-2zM17 12h1v1h-1zM20 12h3v1h-3zM24 12h1v1h-1zM26 12h1v1h-1zM28 12h1v1h-1zM0 14h2v1H0zM3 14h1v1H3zM5 14h1v1H5zM8 14h3v1H8zM12 14h1v1h-1zM14 14h1v1h-1zM16 14h3v1h-3zM21 14h1v1h-1zM23 14h2v1h-2zM26 14h1v1h-1zM28 14h1v1h-1zM0 16h3v1H0zM4 16h1v1H4zM6 16h2v1H6zM9 16h1v1H9zM11 16h3v1h-3zM15 16h1v1h-1zM17 16h2v1h-2zM20 16h1v1h-1zM22 16h1v1h-1zM24 16h2v1h-2zM27 16h2v1h-2zM0 18h1v1H0zM2 18h1v1H2zM4 18h3v1H4zM8 18h2v1H8zM11 18h1v1h-1zM13 18h2v1h-2zM16 18h1v1h-1zM18 18h3v1h-3zM22 18h1v1h-1zM24 18h1v1h-1zM26 18h1v1h-1zM28 18h1v1h-1zM0 20h2v1H0zM3 20h2v1H3zM6 20h1v1H6zM8 20h1v1H8zM10 20h3v1h-3zM14 20h2v1h-2zM17 20h1v1h-1zM19 20h1v1h-1zM21 20h2v1h-2zM24 20h3v1h-3zM28 20h1v1h-1zM8 22h3v1H8zM12 22h1v1h-1zM14 22h2v1h-2zM17 22h2v1h-2zM20 22h1v1h-1zM22 22h1v1h-1zM24 22h1v1h-1zM26 22h1v1h-1zM28 22h1v1h-1zM8 23h1v1H8zM10 23h2v1h-2zM13 23h1v1h-1zM15 23h1v1h-1zM17 23h1v1h-1zM19 23h2v1h-2zM22 23h2v1h-2zM25 23h2v1h-2zM28 23h1v1h-1zM8 24h3v1H8zM12 24h3v1h-3zM16 24h1v1h-1zM18 24h1v1h-1zM20 24h1v1h-1zM22 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM28 24h1v1h-1zM8 25h1v1H8zM10 25h1v1h-1zM12 25h1v1h-1zM14 25h2v1h-2zM17 25h3v1h-3zM21 25h1v1h-1zM23 25h2v1h-2zM26 25h3v1h-3zM8 26h2v1H8zM11 26h2v1h-2zM14 26h1v1h-1zM16 26h2v1h-2zM19 26h1v1h-1zM21 26h2v1h-2zM24 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM8 27h3v1H8zM12 27h1v1h-1zM14 27h3v1h-3zM18 27h1v1h-1zM20 27h1v1h-1zM22 27h1v1h-1zM24 27h2v1h-2zM27 27h2v1h-2zM8 28h5v1H8zM14 28h2v1h-2zM17 28h1v1h-1zM19 28h2v1h-2zM22 28h3v1h-3zM26 28h1v1h-1zM28 28h1v1h-1z"/>
                                </svg>
                                <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 rounded-xl backdrop-blur-xs">
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest text-center">Token Hash:</p>
                                    <p className="text-[8px] font-mono font-bold text-slate-700 truncate w-full text-center mt-0.5">{selectedQRLesson.id}-{(selectedQRLesson.studentId || '').substring(0, 8)}</p>
                                </div>
                            </div>
                            
                            <div className="mt-6 w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-left space-y-1 text-xs">
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-400">Student:</span>
                                    <span>{normalizedStudents.find(s => s.id === selectedQRLesson.studentId)?.fullName || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-400">Lesson Type:</span>
                                    <span className="text-indigo-600">{selectedQRLesson.lessonType || 'Practical'}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-400">Scheduled Time:</span>
                                    <span>{selectedQRLesson.startTime} - {selectedQRLesson.endTime}</span>
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    const lessonToComplete = selectedQRLesson;
                                    setSelectedQRLesson(null);
                                    await onUpdateLesson?.({ ...lessonToComplete, status: 'Completed' });
                                    success?.("QR Check-In Verified! Attendance marked automatically.");
                                }}
                                className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
                                Simulate Student Scan Check-In
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'showcase' && (
                    <div className="space-y-12 animate-fade-in pb-20">
                        <div className="bg-slate-900 rounded-[4rem] p-12 md:p-20 relative overflow-hidden border border-white/5 shadow-2xl">
                            <div className="absolute inset-0 animate-mesh opacity-20 pointer-events-none"></div>
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                <div className="space-y-8">
                                    <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-2xl px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-indigo-300 border border-white/10">
                                        <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                        Specialized Module Showcase
                                    </div>
                                    <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none italic">
                                        Drive Into The <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400">Future.</span>
                                    </h2>
                                    <p className="text-slate-400 font-medium text-lg leading-relaxed">
                                        Transform your driving school from a traditional business into a high-tech, automated powerhouse. Our latest module brings silicon-valley grade automation to your fleet, instructors, and students.
                                    </p>
                                    <div className="flex items-center gap-6">
                                        <button className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform shadow-2xl">
                                            Activate V2 Features
                                        </button>
                                        <button className="px-10 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors">
                                            Download Assets
                                        </button>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute -inset-4 bg-indigo-500/20 rounded-[3rem] blur-3xl group-hover:scale-110 transition-transform"></div>
                                    <div className="relative aspect-video bg-slate-800 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                                        <img src="/marketing/driving_school_hero_3d_1778920419924.png" className="w-full h-full object-cover" alt="Driving School V2" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                                        <div className="absolute bottom-8 left-8">
                                            <p className="text-white font-black uppercase tracking-widest text-xs">Fleet Management V2</p>
                                            <p className="text-white/60 text-[10px] font-bold uppercase mt-1">Intelligent 3D Monitoring</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
                                <div className="h-64 rounded-3xl overflow-hidden relative">
                                    <img src="/marketing/driving_school_scheduling_3d_1778920509602.png" className="w-full h-full object-cover" alt="Scheduling" />
                                    <div className="absolute inset-0 bg-indigo-600/10 mix-blend-overlay"></div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Intelligent Scheduling</h3>
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                        Stop manual planning. Start Auto-Scheduling. Our digital clockwork mechanism aligns lessons with car availability and instructor calendars in milliseconds.
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
                                <div className="h-64 rounded-3xl overflow-hidden relative">
                                    <img src="/marketing/driving_school_mastery_3d_1778920618450.png" className="w-full h-full object-cover" alt="Mastery" />
                                    <div className="absolute inset-0 bg-purple-600/10 mix-blend-overlay"></div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Data-Driven Mastery</h3>
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                        Track every turn, every signal, and every maneuver. Provide students with a 3D visualization of their driving progress and skill development.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-600 rounded-[3rem] p-12 text-center text-white space-y-6">
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter">Ready to Accelerate?</h3>
                            <p className="text-indigo-100 max-w-2xl mx-auto font-medium">
                                The Driving School V2 module is a premium add-on designed for high-growth institutions. Enable it today to unlock advanced automation and analytics.
                            </p>
                            <div className="flex items-center justify-center gap-4">
                                <div className="flex -space-x-4">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="w-12 h-12 rounded-full border-4 border-indigo-600 bg-slate-200 overflow-hidden">
                                            <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Joined by 45+ Driving Schools this month</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
                        {/* PDF Preview Modal */}
            {previewPdf && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Document Preview</h3>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Driving School Reports Hub</p>
                            </div>
                            <button 
                                onClick={() => setPreviewPdf(null)}
                                className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all active:scale-95"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4">
                            <iframe 
                                src={previewPdf} 
                                className="w-full h-full rounded-2xl border-none shadow-inner"
                                title="Report Preview"
                            />
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setPreviewPdf(null)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Close</button>
                            <a 
                                href={previewPdf} 
                                download="Report.pdf"
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <DownloadIcon className="w-4 h-4" /> Download PDF
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {/* Test & Assessment Scoring Modal */}
            {scoringStudent && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col p-8 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Internal Assessment</h3>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{scoringStudent.fullName}</p>
                            </div>
                            <button 
                                onClick={() => setScoringStudent(null)}
                                className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all active:scale-95"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Theory Test Score (%)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    value={scoringStudent.theoryTestScore ?? ""} 
                                    onChange={e => setScoringStudent({
                                        ...scoringStudent, 
                                        theoryTestScore: e.target.value === "" ? undefined : parseInt(e.target.value)
                                    })} 
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100" 
                                    placeholder="e.g. 85"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Practical Test Score (%)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    value={scoringStudent.practicalTestScore ?? ""} 
                                    onChange={e => setScoringStudent({
                                        ...scoringStudent, 
                                        practicalTestScore: e.target.value === "" ? undefined : parseInt(e.target.value)
                                    })} 
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100" 
                                    placeholder="e.g. 90"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NTSA Booking Status</label>
                                <select 
                                    value={scoringStudent.ntsaBookingStatus || "Not Booked"} 
                                    onChange={e => setScoringStudent({
                                        ...scoringStudent, 
                                        ntsaBookingStatus: e.target.value as any
                                    })} 
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"
                                >
                                    <option value="Not Booked">Not Booked</option>
                                    <option value="Eligible">Eligible for Booking</option>
                                    <option value="Booked">Booked for Test</option>
                                    <option value="Passed">Passed NTSA Test</option>
                                    <option value="Failed">Failed NTSA Test</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button 
                                onClick={() => setScoringStudent(null)} 
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    setIsActionLoading(true);
                                    try {
                                        await onUpdateStudent(scoringStudent);
                                        setScoringStudent(null);
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setIsActionLoading(false);
                                    }
                                }}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Save Scores
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppErrorBoundary>
    );
};

// Deployment Trigger: 2026-05-12 00:35 UTC
