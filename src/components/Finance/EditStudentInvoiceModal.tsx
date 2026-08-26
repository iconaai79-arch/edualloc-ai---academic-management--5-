import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User, Institution, Invoice, InvoiceItem, VoteHead, AcademicYear, Semester } from '../../types';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { CheckIcon } from '../icons/CheckIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { apiService } from '../../services/apiService';

interface EditStudentInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    institution: Institution;
    students: User[];
    voteHeads?: VoteHead[];
    academicYears?: AcademicYear[];
    semesters?: Semester[];
    onSaveSuccess?: (updatedInvoice: Invoice) => void;
    onRefreshData?: () => Promise<void>;
}

interface EditableVoteheadItem {
    id: string;
    description: string;
    unitPrice: number | string;
    quantity: number | string;
}

const DEFAULT_VOTEHEADS = [
    'Tuition Fee',
    'Boarding Fee',
    'Lunch / Catering',
    'Transport / Bus',
    'KNEC Examination',
    'Activity / Sports',
    'Opening balance',
    'ADM / Admission',
    'PE / Uniform',
    'Library & Learning Material',
    'Maintenance / Development',
    'Medical / Insurance',
    'PTA / Parents Fund',
    'Computer / ICT',
    'Remedial / Tuition'
];

// Helper to extract admission number from any student or invoice object structure
export const extractAdmissionNumber = (obj: any): string => {
    if (!obj) return '';
    const candidates = [
        obj.admissionNumber,
        obj.admission_number,
        obj.studentAdmissionNumber,
        obj.student_admission_number,
        obj.admNo,
        obj.adm_no,
        obj.adm,
        obj.metadata?.admissionNumber,
        obj.metadata?.admission_number,
        obj.metadata?.admNo,
        obj.metadata?.adm_no,
        obj.metadata?.studentAdmissionNumber,
        obj.metadata?.adm
    ];
    for (const c of candidates) {
        if (c !== undefined && c !== null && String(c).trim() !== '' && String(c).trim() !== '—') {
            return String(c).trim();
        }
    }
    return '';
};

// Helper to extract student name from any object structure
export const extractStudentName = (obj: any): string => {
    if (!obj) return '';
    const candidates = [
        obj.name,
        obj.fullName,
        obj.full_name,
        obj.studentName,
        obj.student_name,
        obj.metadata?.name,
        obj.metadata?.studentName,
        obj.metadata?.fullName
    ];
    for (const c of candidates) {
        if (c !== undefined && c !== null && String(c).trim() !== '' && String(c).trim() !== '—') {
            return String(c).trim();
        }
    }
    return '';
};

// Helper to extract class name from any object structure
export const extractClassName = (obj: any): string => {
    if (!obj) return '';
    const candidates = [
        obj.className,
        obj.class_name,
        obj.studentClass,
        obj.student_class,
        obj.gradeLevel,
        obj.grade_level,
        obj.metadata?.className,
        obj.metadata?.class_name,
        obj.metadata?.studentClass
    ];
    for (const c of candidates) {
        if (c !== undefined && c !== null && String(c).trim() !== '' && String(c).trim() !== '—') {
            return String(c).trim();
        }
    }
    return '';
};

export const findMatchingStudent = (inv: any, studentList: User[]): User | null => {
    if (!inv || !studentList || studentList.length === 0) return null;

    const studentId = inv.studentId || inv.student_id || inv.userId || inv.user_id;
    if (studentId) {
        const byId = studentList.find(s => s.id === studentId || (s as any).userId === studentId || (s as any).user_id === studentId);
        if (byId) return byId;
    }

    const invAdm = extractAdmissionNumber(inv).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (invAdm) {
        const byAdm = studentList.find(s => {
            const sAdm = extractAdmissionNumber(s).toLowerCase().replace(/[^a-z0-9]/g, '');
            return sAdm && sAdm === invAdm;
        });
        if (byAdm) return byAdm;
    }

    const invName = extractStudentName(inv).toLowerCase().trim();
    if (invName && invName !== 'unknown student' && invName !== 'student') {
        const byName = studentList.find(s => {
            const sName = extractStudentName(s).toLowerCase().trim();
            return sName && (sName === invName || sName.includes(invName) || invName.includes(sName));
        });
        if (byName) return byName;
    }

    return null;
};

export const EditStudentInvoiceModal: React.FC<EditStudentInvoiceModalProps> = ({
    isOpen,
    onClose,
    invoice,
    institution,
    students,
    voteHeads = [],
    academicYears = [],
    semesters = [],
    onSaveSuccess,
    onRefreshData
}) => {
    if (!isOpen || !invoice) return null;

    // Student selection & search state
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const studentSearchRef = useRef<HTMLDivElement>(null);

    // Metadata state
    const [academicYear, setAcademicYear] = useState<string>('');
    const [term, setTerm] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [issueDate, setIssueDate] = useState<string>('');

    // Line items / voteheads state
    const [items, setItems] = useState<EditableVoteheadItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Initialize state from the selected invoice
    useEffect(() => {
        if (!invoice) return;

        const matchedStudent = findMatchingStudent(invoice, students);
        if (matchedStudent) {
            setSelectedStudentId(matchedStudent.id);
            const adm = extractAdmissionNumber(matchedStudent) || extractAdmissionNumber(invoice);
            const name = extractStudentName(matchedStudent) || extractStudentName(invoice);
            setStudentSearchQuery(adm ? `${name} [${adm}]` : name);
        } else {
            const invStudentId = invoice.studentId || (invoice as any).student_id || (invoice as any).userId || (invoice as any).user_id || '';
            setSelectedStudentId(invStudentId);
            const invAdm = extractAdmissionNumber(invoice);
            const invName = extractStudentName(invoice);
            if (invName) {
                setStudentSearchQuery(invAdm ? `${invName} [${invAdm}]` : invName);
            } else if (invAdm) {
                setStudentSearchQuery(`[${invAdm}]`);
            } else {
                setStudentSearchQuery('');
            }
        }

        // Academic Year
        const invYear = (invoice as any).academicYear || (invoice as any).academic_year || (invoice as any).metadata?.academicYear || (invoice as any).metadata?.academic_year || new Date().getFullYear().toString();
        setAcademicYear(invYear);

        // Term
        const invTerm = (invoice as any).term || (invoice as any).semester || (invoice as any).metadata?.term || (invoice as any).metadata?.semester || 'Term 1';
        setTerm(invTerm);

        // Due Date
        const invDueDate = invoice.dueDate || invoice.due_date || invoice.issueDate || new Date().toISOString().split('T')[0];
        setDueDate(invDueDate.split('T')[0]);

        // Issue Date
        const invIssueDate = invoice.issueDate || (invoice as any).issue_date || (invoice as any).createdAt || new Date().toISOString().split('T')[0];
        setIssueDate(invIssueDate.split('T')[0]);

        // Items
        const invItems: InvoiceItem[] = Array.isArray(invoice.items) && invoice.items.length > 0
            ? invoice.items
            : [
                {
                    description: (invoice as any).description || 'Tuition Fee',
                    unitPrice: Number(invoice.totalAmount || (invoice as any).total_amount || 0),
                    quantity: 1,
                    amount: Number(invoice.totalAmount || (invoice as any).total_amount || 0)
                }
            ];

        setItems(
            invItems.map((item, idx) => ({
                id: `item_${Date.now()}_${idx}`,
                description: item.description || '',
                unitPrice: Number(item.unitPrice ?? item.amount ?? 0),
                quantity: Number(item.quantity ?? 1)
            }))
        );

        setErrorMsg(null);
    }, [invoice, students]);

    // Handle clicks outside student dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (studentSearchRef.current && !studentSearchRef.current.contains(e.target as Node)) {
                setIsStudentDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtered students for autocomplete
    const filteredStudents = useMemo(() => {
        if (!studentSearchQuery.trim()) return students.slice(0, 15);
        const query = studentSearchQuery.toLowerCase().trim();
        return students.filter(s => {
            const name = extractStudentName(s).toLowerCase();
            const adm = extractAdmissionNumber(s).toLowerCase();
            const cls = extractClassName(s).toLowerCase();
            return name.includes(query) || adm.includes(query) || cls.includes(query);
        }).slice(0, 20);
    }, [students, studentSearchQuery]);

    // Selected student details for avatar card
    const selectedStudent = useMemo(() => {
        if (selectedStudentId) {
            const found = students.find(s => s.id === selectedStudentId || (s as any).userId === selectedStudentId);
            if (found) return found;
        }
        return findMatchingStudent(invoice, students);
    }, [students, selectedStudentId, invoice]);

    // Available Voteheads list
    const availableVoteheadOptions = useMemo(() => {
        const customNames = voteHeads.map(v => v.name).filter(Boolean);
        const combined = Array.from(new Set([...customNames, ...DEFAULT_VOTEHEADS]));
        return combined;
    }, [voteHeads]);

    // Total calculation
    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => {
            const price = parseFloat(String(item.unitPrice || 0)) || 0;
            const qty = parseFloat(String(item.quantity || 0)) || 0;
            return sum + (price * qty);
        }, 0);
    }, [items]);

    // Resolved admission number, name, and class for the display card
    const displayAdm = useMemo(() => {
        return extractAdmissionNumber(selectedStudent) || extractAdmissionNumber(invoice) || '—';
    }, [selectedStudent, invoice]);

    const displayName = useMemo(() => {
        return extractStudentName(selectedStudent) || extractStudentName(invoice) || 'Student';
    }, [selectedStudent, invoice]);

    const displayClass = useMemo(() => {
        return extractClassName(selectedStudent) || extractClassName(invoice) || '—';
    }, [selectedStudent, invoice]);

    // Generate Initials
    const studentInitials = useMemo(() => {
        const name = displayName;
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }, [displayName]);

    // Avatar Background color based on name
    const avatarColor = useMemo(() => {
        const name = displayName;
        const colors = [
            'bg-amber-800 text-amber-100',
            'bg-indigo-700 text-indigo-100',
            'bg-emerald-700 text-emerald-100',
            'bg-rose-700 text-rose-100',
            'bg-purple-700 text-purple-100',
            'bg-teal-700 text-teal-100',
            'bg-cyan-800 text-cyan-100',
            'bg-stone-700 text-stone-100'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }, [displayName]);

    const handleSelectStudent = (st: User) => {
        setSelectedStudentId(st.id);
        const adm = extractAdmissionNumber(st);
        const name = extractStudentName(st);
        setStudentSearchQuery(adm ? `${name} [${adm}]` : name);
        setIsStudentDropdownOpen(false);
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: `item_${Date.now()}_${prev.length}`,
                description: '',
                unitPrice: '',
                quantity: 1
            }
        ]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length <= 1) {
            setErrorMsg("An invoice must contain at least one line item.");
            return;
        }
        setItems(prev => prev.filter(i => i.id !== id));
        setErrorMsg(null);
    };

    const handleItemChange = (id: string, field: keyof EditableVoteheadItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleSave = async () => {
        if (items.length === 0) {
            setErrorMsg("Please add at least one votehead item.");
            return;
        }

        // Validate items
        const formattedItems: InvoiceItem[] = items.map(item => {
            const desc = (item.description || 'Tuition Fee').trim();
            const unitPrice = Math.max(0, parseFloat(String(item.unitPrice || 0)) || 0);
            const quantity = Math.max(1, parseFloat(String(item.quantity || 1)) || 1);
            return {
                description: desc,
                unitPrice,
                quantity,
                amount: unitPrice * quantity
            };
        });

        if (formattedItems.some(i => !i.description)) {
            setErrorMsg("Please select or enter a description for all voteheads.");
            return;
        }

        setIsSaving(true);
        setErrorMsg(null);

        try {
            const studentAdm = selectedStudent
                ? ((selectedStudent as any).admissionNumber || (selectedStudent as any).admission_number || (selectedStudent as any).admNo || '')
                : ((invoice as any).admissionNumber || (invoice as any).admission_number || '');

            const studentClass = selectedStudent
                ? ((selectedStudent as any).className || (selectedStudent as any).class_name || '')
                : ((invoice as any).className || (invoice as any).studentClass || '');

            const studentName = selectedStudent
                ? selectedStudent.name
                : ((invoice as any).studentName || (invoice as any).name || '');

            const updatedInvoicePayload: any = {
                ...invoice,
                studentId: selectedStudentId || invoice.studentId || (invoice as any).student_id || null,
                student_id: selectedStudentId || invoice.studentId || (invoice as any).student_id || null,
                admissionNumber: studentAdm,
                admission_number: studentAdm,
                studentName: studentName,
                student_name: studentName,
                className: studentClass,
                class_name: studentClass,
                studentClass: studentClass,
                student_class: studentClass,
                items: formattedItems,
                subtotal: totalAmount,
                totalAmount: totalAmount,
                total_amount: totalAmount,
                dueDate: dueDate,
                due_date: dueDate,
                issueDate: issueDate,
                issue_date: issueDate,
                academicYear: academicYear,
                academic_year: academicYear,
                term: term,
                metadata: {
                    ...((invoice as any).metadata || {}),
                    academicYear: academicYear,
                    academic_year: academicYear,
                    term: term,
                    studentName: studentName,
                    admissionNumber: studentAdm,
                    className: studentClass,
                    lastEditedAt: new Date().toISOString()
                },
                updatedAt: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const savedResult = await apiService.saveModuleRecord('invoices', updatedInvoicePayload);
            const finalSaved = savedResult ? { ...updatedInvoicePayload, ...savedResult } : updatedInvoicePayload;

            if (onSaveSuccess) {
                onSaveSuccess(finalSaved);
            }

            if (onRefreshData) {
                try {
                    await onRefreshData();
                } catch (_) {}
            }

            onClose();
        } catch (err: any) {
            console.error("Failed to update student invoice:", err);
            setErrorMsg(err?.message || "Failed to save invoice changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in text-left">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-auto transition-all animate-scale-up">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        Edit invoice '{invoice.invoiceNumber || (invoice as any).invoice_number || invoice.id}'
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Add Votehead Row"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Close"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-300">
                        {errorMsg}
                    </div>
                )}

                {/* Body Content */}
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Top Section: Left (Student Card) & Right (Form Fields) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        
                        {/* Left: Student Card */}
                        <div className="md:col-span-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col items-center text-center space-y-4">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black shadow-md ${avatarColor}`}>
                                {studentInitials}
                            </div>
                            <div className="w-full space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-400 font-semibold">Admission</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {displayAdm}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-400 font-semibold">Name</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]" title={displayName}>
                                        {displayName}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-400 font-semibold">Class</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]" title={displayClass}>
                                        {displayClass}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Metadata Inputs */}
                        <div className="md:col-span-8 space-y-4">
                            
                            {/* Student Search & Select Input */}
                            <div className="relative" ref={studentSearchRef}>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Enter student's name or admission number
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={studentSearchQuery}
                                        onChange={(e) => {
                                            setStudentSearchQuery(e.target.value);
                                            setIsStudentDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsStudentDropdownOpen(true)}
                                        placeholder="Search by student name or admission number..."
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                    <SearchIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                                </div>

                                {/* Autocomplete Dropdown */}
                                {isStudentDropdownOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map(st => {
                                                const adm = (st as any).admissionNumber || (st as any).admission_number || (st as any).admNo || 'No ADM';
                                                const cls = (st as any).className || (st as any).class_name || 'No Class';
                                                const isCurrent = st.id === selectedStudentId;
                                                return (
                                                    <div
                                                        key={st.id}
                                                        onClick={() => handleSelectStudent(st)}
                                                        className={`p-3 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 cursor-pointer flex items-center justify-between transition-colors ${
                                                            isCurrent ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''
                                                        }`}
                                                    >
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{st.name}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium">ADM: {adm} • Class: {cls}</p>
                                                        </div>
                                                        {isCurrent && <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-3 text-xs text-slate-400 text-center">No students matching "{studentSearchQuery}"</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Academic Year Dropdown */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Academic year
                                </label>
                                <select
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                >
                                    {academicYears.length > 0 ? (
                                        academicYears.map(yr => (
                                            <option key={yr.id || yr.name} value={yr.name}>{yr.name}</option>
                                        ))
                                    ) : (
                                        [2024, 2025, 2026, 2027, 2028].map(yr => (
                                            <option key={yr} value={yr.toString()}>{yr}</option>
                                        ))
                                    )}
                                </select>
                            </div>

                            {/* Term Dropdown */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Term
                                </label>
                                <select
                                    value={term}
                                    onChange={(e) => setTerm(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                >
                                    <option value="Term 1">Term 1</option>
                                    <option value="Term 2">Term 2</option>
                                    <option value="Term 3">Term 3</option>
                                    <option value="Annual / All Terms">Annual / All Terms</option>
                                    <option value="Semester 1">Semester 1</option>
                                    <option value="Semester 2">Semester 2</option>
                                    <option value="Semester 3">Semester 3</option>
                                </select>
                            </div>

                            {/* Due Date Input */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Due date
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Voteheads Divider */}
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                        <span className="flex-shrink mx-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Voteheads</span>
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                    </div>

                    {/* Voteheads Line Items List */}
                    <div className="space-y-3">
                        {items.map((item, idx) => {
                            const isKnownOption = availableVoteheadOptions.includes(item.description);
                            return (
                                <div key={item.id} className="grid grid-cols-12 gap-3 items-center">
                                    
                                    {/* Votehead Description Selector / Text Input */}
                                    <div className="col-span-12 sm:col-span-6">
                                        <div className="relative">
                                            <input
                                                list={`votehead-list-${item.id}`}
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                placeholder="Select or enter votehead name (e.g. Lunch, KNEC, Tuition)..."
                                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            />
                                            <datalist id={`votehead-list-${item.id}`}>
                                                {availableVoteheadOptions.map(vName => (
                                                    <option key={vName} value={vName} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>

                                    {/* Unit Cost */}
                                    <div className="col-span-6 sm:col-span-3">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={item.unitPrice}
                                                onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                                                placeholder="Unit cost (e.g. 5000)"
                                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-right"
                                            />
                                        </div>
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-4 sm:col-span-2">
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                            placeholder="Qty"
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-center"
                                        />
                                    </div>

                                    {/* Delete Button */}
                                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.id)}
                                            disabled={items.length <= 1}
                                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                            title="Remove votehead"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Votehead Row Button */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer border border-dashed border-indigo-200 dark:border-indigo-800"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                <span>Add Another Votehead</span>
                            </button>
                        </div>
                    </div>

                    {/* Total Summary */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Invoice Amount:</span>
                        <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                            KES {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-5 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Saving Changes...</span>
                            </>
                        ) : (
                            <span>Save Changes</span>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
