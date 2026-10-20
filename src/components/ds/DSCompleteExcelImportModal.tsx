import React, { useState } from 'react';
import { 
    XIcon, 
    ArrowUpTrayIcon, 
    CheckCircleIcon, 
    DownloadIcon, 
    SparklesIcon, 
    UsersIcon, 
    DocumentTextIcon, 
    CreditCardIcon, 
    AcademicCapIcon, 
    BanknotesIcon, 
    ShieldCheckIcon
} from '../icons';
import { useToast } from '../../services/ToastContext';
import * as XLSX from 'xlsx';
import { cleanPhone, parseAmount, toIsoDate, phoneKey } from './dsExcelImport';
import type { 
    DSStudent, 
    DSInvoice, 
    DSPayment, 
    DSLicenseCategory, 
    DSVote, 
    DSInstructor, 
    Branch,
    DSSettings
} from '../../types';
import { apiService } from '../../services/apiService';

interface DSCompleteExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentInstitution: any;
    settings: DSSettings | null;
    students: DSStudent[];
    invoices: DSInvoice[];
    payments: DSPayment[];
    instructors: DSInstructor[];
    branches: Branch[];
    onAddStudent: (student: any) => Promise<any>;
    onUpdateStudent?: (student: any) => Promise<any>;
    onAddInvoice: (invoice: any) => Promise<any>;
    onAddPayment: (payment: any) => Promise<any>;
    onAddInstructor: (instructor: any) => Promise<any>;
    onUpdateSettings: (settings: any) => Promise<any>;
    refreshData: () => Promise<void>;
}

interface DetectedDataset {
    id: 'categories' | 'votes' | 'instructors' | 'students' | 'invoices' | 'receipts';
    title: string;
    sheetName: string;
    icon: React.FC<{ className?: string }>;
    color: string;
    rows: any[];
    selected: boolean;
}

const getRowVal = (row: any, ...candidates: string[]): any => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    for (const cand of candidates) {
        const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const k of keys) {
            const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK === cleanCand) return row[k];
        }
    }
    for (const cand of candidates) {
        const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const k of keys) {
            const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK.includes(cleanCand)) return row[k];
        }
    }
    return '';
};

export const DSCompleteExcelImportModal: React.FC<DSCompleteExcelImportModalProps> = ({
    isOpen,
    onClose,
    currentInstitution,
    settings,
    students,
    invoices,
    payments,
    instructors,
    branches,
    onAddStudent,
    onUpdateStudent,
    onAddInvoice,
    onAddPayment,
    onAddInstructor,
    onUpdateSettings,
    refreshData
}) => {
    const { success, error: toastError, info: toastInfo } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'summary'>('upload');
    const [detectedDatasets, setDetectedDatasets] = useState<DetectedDataset[]>([]);
    const [updateExisting, setUpdateExisting] = useState(true);
    const [progressText, setProgressText] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);

    const [importStats, setImportStats] = useState<{
        studentsCreated: number;
        studentsUpdated: number;
        invoicesCreated: number;
        receiptsCreated: number;
        categoriesMerged: number;
        votesMerged: number;
        instructorsCreated: number;
        errors: string[];
    }>({
        studentsCreated: 0,
        studentsUpdated: 0,
        invoicesCreated: 0,
        receiptsCreated: 0,
        categoriesMerged: 0,
        votesMerged: 0,
        instructorsCreated: 0,
        errors: []
    });

    if (!isOpen) return null;

    const handleFileSelect = async (selectedFile: File) => {
        setFile(selectedFile);
        setIsParsing(true);
        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                toastError("No sheets found in the selected Excel file.");
                setFile(null);
                setIsParsing(false);
                return;
            }

            const datasets: DetectedDataset[] = [];

            workbook.SheetNames.forEach(sheetName => {
                const ws = workbook.Sheets[sheetName];
                if (!ws || !ws['!ref']) return;

                const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', blankrows: false });
                if (!rawRows || rawRows.length === 0) return;

                const sLower = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const firstRowKeys = Object.keys(rawRows[0] || {}).map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

                // 1. Students
                if (
                    sLower.includes('student') || sLower.includes('roster') || sLower.includes('candidate') ||
                    (firstRowKeys.some(k => k.includes('admission') || k.includes('admno')) && firstRowKeys.some(k => k.includes('name')))
                ) {
                    datasets.push({
                        id: 'students',
                        title: 'Students Roster',
                        sheetName,
                        icon: UsersIcon,
                        color: 'indigo',
                        rows: rawRows,
                        selected: true
                    });
                }
                // 2. Invoices
                else if (
                    sLower.includes('invoice') || sLower.includes('billing') ||
                    firstRowKeys.some(k => k.includes('invoicenumber') || k.includes('invoiceno'))
                ) {
                    datasets.push({
                        id: 'invoices',
                        title: 'Billing Invoices',
                        sheetName,
                        icon: DocumentTextIcon,
                        color: 'blue',
                        rows: rawRows,
                        selected: true
                    });
                }
                // 3. Receipts
                else if (
                    sLower.includes('receipt') || sLower.includes('payment') ||
                    firstRowKeys.some(k => k.includes('receiptnumber') || k.includes('receiptno'))
                ) {
                    datasets.push({
                        id: 'receipts',
                        title: 'Receipts & Payments',
                        sheetName,
                        icon: CreditCardIcon,
                        color: 'emerald',
                        rows: rawRows,
                        selected: true
                    });
                }
                // 4. Categories
                else if (
                    sLower.includes('categor') || sLower.includes('licenseclass') ||
                    firstRowKeys.some(k => k.includes('categorycode') || k.includes('basecode') || k.includes('basetuition'))
                ) {
                    datasets.push({
                        id: 'categories',
                        title: 'License Categories',
                        sheetName,
                        icon: AcademicCapIcon,
                        color: 'purple',
                        rows: rawRows,
                        selected: true
                    });
                }
                // 5. Voteheads
                else if (
                    sLower.includes('vote') || sLower.includes('feehead') ||
                    firstRowKeys.some(k => k.includes('votehead') || k.includes('feevote') || k.includes('mandatoryassessment'))
                ) {
                    datasets.push({
                        id: 'votes',
                        title: 'Fee Voteheads',
                        sheetName,
                        icon: BanknotesIcon,
                        color: 'amber',
                        rows: rawRows,
                        selected: true
                    });
                }
                // 6. Users / Staff / Instructors
                else if (
                    sLower.includes('user') || sLower.includes('staff') || sLower.includes('instructor') || sLower.includes('trainer') ||
                    firstRowKeys.some(k => k.includes('primaryrole') || k.includes('instructor') || k.includes('specialization'))
                ) {
                    datasets.push({
                        id: 'instructors',
                        title: 'System Users & Staff',
                        sheetName,
                        icon: ShieldCheckIcon,
                        color: 'cyan',
                        rows: rawRows,
                        selected: true
                    });
                }
            });

            if (datasets.length === 0) {
                toastError("No matching Driving School operational datasets recognized in this Excel file. Ensure sheet names or headers match standard templates.");
                setFile(null);
                setIsParsing(false);
                return;
            }

            setDetectedDatasets(datasets);
            setStep('review');
        } catch (err: any) {
            console.error("Failed to parse Excel workbook:", err);
            toastError("Failed to parse Excel file: " + (err?.message || err));
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    const toggleDatasetSelection = (id: string) => {
        setDetectedDatasets(prev => prev.map(d => d.id === id ? { ...d, selected: !d.selected } : d));
    };

    const handleExecuteImport = async () => {
        setIsProcessing(true);
        setStep('importing');
        setProgressPercent(5);
        setProgressText('Initializing import pipeline...');

        const instId = currentInstitution?.id;
        const errors: string[] = [];
        let studentsCreated = 0;
        let studentsUpdated = 0;
        let invoicesCreated = 0;
        let receiptsCreated = 0;
        let categoriesMerged = 0;
        let votesMerged = 0;
        let instructorsCreated = 0;

        try {
            // Index existing records for fast matching
            const existingStudentMap = new Map<string, DSStudent>();
            const phoneToStudentMap = new Map<string, DSStudent>();
            students.forEach(s => {
                if (s.admissionNumber) existingStudentMap.set(s.admissionNumber.toLowerCase().trim(), s);
                const pk = phoneKey(s.phone);
                if (pk.length >= 9) phoneToStudentMap.set(pk, s);
            });

            const existingInstructorEmails = new Set(instructors.map(i => i.email?.toLowerCase().trim()).filter(Boolean));
            const existingInstructorPhones = new Set(instructors.map(i => cleanPhone(i.phone)).filter(Boolean));

            const existingInvoices = new Map<string, DSInvoice>();
            invoices.forEach(inv => {
                if (inv.invoiceNumber) existingInvoices.set(inv.invoiceNumber.toLowerCase().trim(), inv);
            });

            const existingReceipts = new Set(payments.map(p => (p.receiptNumber || '').toLowerCase().trim()).filter(Boolean));

            // 1. IMPORT CATEGORIES
            const catDataset = detectedDatasets.find(d => d.id === 'categories' && d.selected);
            if (catDataset && catDataset.rows.length > 0) {
                setProgressText(`Importing ${catDataset.rows.length} license categories...`);
                setProgressPercent(15);
                const currentCategories: DSLicenseCategory[] = [...(settings?.licenseCategories || [])];
                
                catDataset.rows.forEach(r => {
                    const code = String(getRowVal(r, 'categorycode', 'code', 'category') || '').trim();
                    if (!code) return;
                    const name = String(getRowVal(r, 'categoryname', 'name', 'title') || code).trim();
                    const baseFee = parseAmount(getRowVal(r, 'basetuitionfee', 'basefee', 'fee', 'price'));
                    const desc = String(getRowVal(r, 'description', 'desc') || '').trim();
                    const statusStr = String(getRowVal(r, 'status') || 'Active').toLowerCase();
                    const isActive = statusStr !== 'inactive' && statusStr !== 'disabled';

                    const existingIdx = currentCategories.findIndex(c => c.code.toLowerCase() === code.toLowerCase());
                    const catObj: DSLicenseCategory = {
                        id: existingIdx >= 0 ? currentCategories[existingIdx].id : `cat_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
                        code,
                        name,
                        baseFee,
                        description: desc,
                        parentCategory: 'Driving',
                        isActive
                    };

                    if (existingIdx >= 0) {
                        if (updateExisting) currentCategories[existingIdx] = { ...currentCategories[existingIdx], ...catObj };
                    } else {
                        currentCategories.push(catObj);
                        categoriesMerged++;
                    }
                });

                await onUpdateSettings({ ...settings, licenseCategories: currentCategories }).catch(err => {
                    errors.push(`Categories update warning: ${err?.message || err}`);
                });
            }

            // 2. IMPORT VOTEHEADS
            const voteDataset = detectedDatasets.find(d => d.id === 'votes' && d.selected);
            if (voteDataset && voteDataset.rows.length > 0) {
                setProgressText(`Importing ${voteDataset.rows.length} fee voteheads...`);
                setProgressPercent(30);
                const currentVotes: DSVote[] = [...(settings?.votes || [])];

                voteDataset.rows.forEach(r => {
                    const voteName = String(getRowVal(r, 'feevoteheadname', 'votename', 'name', 'vote') || '').trim();
                    if (!voteName) return;
                    const defaultAmount = parseAmount(getRowVal(r, 'defaultamount', 'amount', 'fee'));
                    const mandatoryStr = String(getRowVal(r, 'mandatoryassessment', 'ismandatory', 'mandatory') || '').toLowerCase();
                    const isMandatory = mandatoryStr.includes('yes') || mandatoryStr === 'true';

                    const existingIdx = currentVotes.findIndex(v => v.voteName.toLowerCase() === voteName.toLowerCase());
                    const voteObj: DSVote = {
                        id: existingIdx >= 0 ? currentVotes[existingIdx].id : `vt_imp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        institutionId: instId || 'default',
                        voteName,
                        defaultAmount,
                        isMandatory
                    };

                    if (existingIdx >= 0) {
                        if (updateExisting) currentVotes[existingIdx] = { ...currentVotes[existingIdx], ...voteObj };
                    } else {
                        currentVotes.push(voteObj);
                        votesMerged++;
                    }
                });

                await onUpdateSettings({ ...settings, votes: currentVotes }).catch(err => {
                    errors.push(`Voteheads update warning: ${err?.message || err}`);
                });
            }

            // 3. IMPORT STAFF & INSTRUCTORS
            const staffDataset = detectedDatasets.find(d => d.id === 'instructors' && d.selected);
            if (staffDataset && staffDataset.rows.length > 0) {
                setProgressText(`Importing ${staffDataset.rows.length} instructors and staff...`);
                setProgressPercent(45);

                for (const r of staffDataset.rows) {
                    const name = String(getRowVal(r, 'fullname', 'name', 'staffname') || '').trim();
                    if (!name) continue;
                    const email = String(getRowVal(r, 'emailaddress', 'email') || '').trim();
                    const phone = cleanPhone(getRowVal(r, 'phonenumber', 'phone'));
                    const staffId = String(getRowVal(r, 'staffemployeeid', 'staffid', 'license', 'licensenumber') || '').trim();
                    const spec = String(getRowVal(r, 'specializationskills', 'specialization', 'skills') || 'Driving Trainer').trim();
                    const instType = String(getRowVal(r, 'driverinstructortype', 'instructortype', 'drivertype') || 'Driving Instructor').trim();
                    const branchName = String(getRowVal(r, 'branchcampus', 'branch') || '').trim();
                    const matchedBranch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase());

                    const alreadyHasInst = (email && existingInstructorEmails.has(email.toLowerCase())) ||
                                           (phone && existingInstructorPhones.has(phone));

                    if (!alreadyHasInst) {
                        try {
                            const newInstructor: any = {
                                id: `inst_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                institutionId: instId,
                                institution_id: instId,
                                name,
                                email: email || undefined,
                                phone: phone || '',
                                licenseNumber: staffId || undefined,
                                specialization: spec,
                                instructorType: instType,
                                branchId: matchedBranch?.id || branches[0]?.id || undefined,
                                status: 'Active'
                            };
                            await onAddInstructor(newInstructor);
                            instructorsCreated++;
                            if (email) existingInstructorEmails.add(email.toLowerCase());
                            if (phone) existingInstructorPhones.add(phone);
                        } catch (err: any) {
                            errors.push(`Instructor ${name}: ${err?.message || 'failed'}`);
                        }
                    }
                }
            }

            // 4. IMPORT STUDENTS
            const studentDataset = detectedDatasets.find(d => d.id === 'students' && d.selected);
            if (studentDataset && studentDataset.rows.length > 0) {
                setProgressText(`Importing ${studentDataset.rows.length} students...`);
                setProgressPercent(60);

                for (const r of studentDataset.rows) {
                    const fullName = String(getRowVal(r, 'fullname', 'studentname', 'name') || '').trim();
                    if (!fullName) continue;

                    let admissionNumber = String(getRowVal(r, 'admissionnumber', 'admno', 'admnumber') || '').trim();
                    const phone = cleanPhone(getRowVal(r, 'phonenumber', 'phone', 'contact'));
                    const email = String(getRowVal(r, 'email', 'emailaddress') || '').trim();
                    const idNumber = String(getRowVal(r, 'nationalidpassport', 'idnumber', 'nationalid') || '').trim();
                    const licenseCategory = String(getRowVal(r, 'licensecategory', 'licenseclass', 'category') || 'B').trim();
                    const courseType = String(getRowVal(r, 'coursetype', 'type') || 'Standard').trim();
                    const status = String(getRowVal(r, 'status') || 'Enrolled').trim();
                    const pdlStatus = String(getRowVal(r, 'pdlstatus') || 'Pending').trim();
                    const ntsaBookingStatus = String(getRowVal(r, 'ntsabookingstatus') || 'Not Booked').trim();
                    const theoryProgressPercent = parseAmount(getRowVal(r, 'theoryprogress', 'theoryprogresspercent'));
                    const practicalProgressPercent = parseAmount(getRowVal(r, 'practicalprogress', 'practicalprogresspercent'));
                    const enrollmentDate = toIsoDate(getRowVal(r, 'enrollmentdate', 'dateenrolled', 'date'));
                    const branchName = String(getRowVal(r, 'branchcampus', 'branch') || '').trim();
                    const matchedBranch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase());

                    const pk = phoneKey(phone);
                    const existing = (admissionNumber && existingStudentMap.get(admissionNumber.toLowerCase())) ||
                                     (pk.length >= 9 && phoneToStudentMap.get(pk));

                    if (existing) {
                        if (updateExisting && onUpdateStudent) {
                            try {
                                await onUpdateStudent({
                                    ...existing,
                                    fullName: fullName || existing.fullName,
                                    email: email || existing.email,
                                    idNumber: idNumber || existing.idNumber,
                                    licenseTypeInterested: licenseCategory || existing.licenseTypeInterested,
                                    courseType: courseType || existing.courseType,
                                    status: status || existing.status,
                                    pdlStatus: pdlStatus || existing.pdlStatus,
                                    ntsaBookingStatus: ntsaBookingStatus || existing.ntsaBookingStatus,
                                    theoryProgressPercent: theoryProgressPercent || existing.theoryProgressPercent,
                                    practicalProgressPercent: practicalProgressPercent || existing.practicalProgressPercent,
                                    branchId: matchedBranch?.id || existing.branchId
                                });
                                studentsUpdated++;
                            } catch (err: any) {
                                errors.push(`Student update ${fullName}: ${err?.message || 'failed'}`);
                            }
                        }
                    } else {
                        try {
                            const newStudent: any = {
                                id: `dss_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                institutionId: instId,
                                institution_id: instId,
                                fullName,
                                admissionNumber: admissionNumber || undefined,
                                phone: phone || undefined,
                                email: email || undefined,
                                idNumber: idNumber || undefined,
                                licenseTypeInterested: licenseCategory,
                                courseType,
                                status,
                                pdlStatus,
                                ntsaBookingStatus,
                                theoryProgressPercent,
                                practicalProgressPercent,
                                enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
                                branchId: matchedBranch?.id || branches[0]?.id || undefined,
                                skipWelcomeSms: true
                            };
                            await onAddStudent(newStudent);
                            studentsCreated++;
                            if (newStudent.admissionNumber) existingStudentMap.set(newStudent.admissionNumber.toLowerCase(), newStudent);
                            if (pk.length >= 9) phoneToStudentMap.set(pk, newStudent);
                        } catch (err: any) {
                            errors.push(`Student ${fullName}: ${err?.message || 'failed'}`);
                        }
                    }
                }
            }

            // 5. IMPORT INVOICES
            const invDataset = detectedDatasets.find(d => d.id === 'invoices' && d.selected);
            if (invDataset && invDataset.rows.length > 0) {
                setProgressText(`Importing ${invDataset.rows.length} billing invoices...`);
                setProgressPercent(75);

                for (const r of invDataset.rows) {
                    const invoiceNumber = String(getRowVal(r, 'invoicenumber', 'invoiceno') || '').trim();
                    if (!invoiceNumber) continue;

                    const adm = String(getRowVal(r, 'admissionnumber', 'admno') || '').trim();
                    const sName = String(getRowVal(r, 'studentname', 'name') || '').trim();
                    const matchedStudent = (adm && existingStudentMap.get(adm.toLowerCase())) ||
                                           students.find(s => s.fullName.toLowerCase() === sName.toLowerCase());

                    const totalAmount = parseAmount(getRowVal(r, 'grossamount', 'totalamount', 'amount'));
                    const discountAmount = parseAmount(getRowVal(r, 'discount', 'discountamount'));
                    const sponsorAmount = parseAmount(getRowVal(r, 'sponsoramount', 'sponsor'));
                    const paidAmount = parseAmount(getRowVal(r, 'paidamount', 'paid'));
                    const balance = parseAmount(getRowVal(r, 'balance', 'netbalance'));
                    const status = String(getRowVal(r, 'status') || 'Pending').trim();
                    const className = String(getRowVal(r, 'licenseclasscategory', 'licenseclass', 'classname') || 'B').trim();
                    const dueDate = toIsoDate(getRowVal(r, 'duedate'));
                    const invDate = toIsoDate(getRowVal(r, 'invoicedate', 'date', 'createdat'));
                    const feeItemsStr = String(getRowVal(r, 'feeitems', 'items') || '').trim();

                    let items = [{ name: `${className} Tuition Fee`, amount: totalAmount }];
                    if (feeItemsStr) {
                        try {
                            const parsed = feeItemsStr.split(';').map(item => {
                                const [iName, iAmt] = item.split(': KES ');
                                return { name: (iName || 'Tuition').trim(), amount: parseAmount(iAmt || 0) };
                            });
                            if (parsed.length > 0) items = parsed;
                        } catch (_) {}
                    }

                    if (!existingInvoices.has(invoiceNumber.toLowerCase())) {
                        try {
                            const invObj: any = {
                                id: `dsi_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                institutionId: instId,
                                institution_id: instId,
                                invoiceNumber,
                                studentId: matchedStudent?.id || '',
                                studentName: matchedStudent?.fullName || sName || 'Candidate',
                                admissionNumber: matchedStudent?.admissionNumber || adm,
                                admission_number: matchedStudent?.admissionNumber || adm,
                                className,
                                totalAmount,
                                discountAmount,
                                sponsorAmount,
                                paidAmount,
                                balance: balance || Math.max(0, totalAmount - discountAmount - sponsorAmount - paidAmount),
                                status,
                                dueDate: dueDate || undefined,
                                createdAt: invDate ? `${invDate}T00:00:00.000Z` : new Date().toISOString(),
                                items
                            };
                            await onAddInvoice(invObj);
                            invoicesCreated++;
                            existingInvoices.set(invoiceNumber.toLowerCase(), invObj);
                        } catch (err: any) {
                            errors.push(`Invoice ${invoiceNumber}: ${err?.message || 'failed'}`);
                        }
                    }
                }
            }

            // 6. IMPORT RECEIPTS / PAYMENTS
            const recDataset = detectedDatasets.find(d => d.id === 'receipts' && d.selected);
            if (recDataset && recDataset.rows.length > 0) {
                setProgressText(`Importing ${recDataset.rows.length} receipts & payments...`);
                setProgressPercent(90);

                for (const r of recDataset.rows) {
                    const receiptNumber = String(getRowVal(r, 'receiptnumber', 'receiptno') || '').trim();
                    if (!receiptNumber) continue;

                    const adm = String(getRowVal(r, 'admissionnumber', 'admno') || '').trim();
                    const sName = String(getRowVal(r, 'studentname', 'name') || '').trim();
                    const matchedStudent = (adm && existingStudentMap.get(adm.toLowerCase())) ||
                                           students.find(s => s.fullName.toLowerCase() === sName.toLowerCase());

                    const invNum = String(getRowVal(r, 'linkedinvoicenumber', 'invoicenumber', 'invoiceid') || '').trim();
                    const matchedInv = existingInvoices.get(invNum.toLowerCase());

                    const amount = parseAmount(getRowVal(r, 'amountpaid', 'amount'));
                    const paymentMethod = String(getRowVal(r, 'paymentmethod', 'method') || 'M-Pesa').trim();
                    const transactionReference = String(getRowVal(r, 'transactionreference', 'reference', 'ref') || '').trim();
                    const paymentDate = toIsoDate(getRowVal(r, 'paymentdate', 'date'));
                    const receivedBy = String(getRowVal(r, 'receivedby') || 'Accounts').trim();
                    const status = String(getRowVal(r, 'status') || 'Completed').trim();

                    if (!existingReceipts.has(receiptNumber.toLowerCase())) {
                        try {
                            const payObj: any = {
                                id: `dsp_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                                institutionId: instId,
                                institution_id: instId,
                                receiptNumber,
                                studentId: matchedStudent?.id || '',
                                studentName: matchedStudent?.fullName || sName || 'Candidate',
                                invoiceId: matchedInv?.id || invNum || '',
                                amount,
                                paymentMethod,
                                transactionReference: transactionReference || 'IMPORT',
                                paymentDate: paymentDate || new Date().toISOString().split('T')[0],
                                receivedBy,
                                status
                            };
                            await onAddPayment(payObj);
                            receiptsCreated++;
                            existingReceipts.add(receiptNumber.toLowerCase());
                        } catch (err: any) {
                            errors.push(`Receipt ${receiptNumber}: ${err?.message || 'failed'}`);
                        }
                    }
                }
            }

            setProgressPercent(100);
            setProgressText('Finalizing and refreshing datasets...');
            await refreshData().catch(() => {});

            setImportStats({
                studentsCreated,
                studentsUpdated,
                invoicesCreated,
                receiptsCreated,
                categoriesMerged,
                votesMerged,
                instructorsCreated,
                errors
            });

            setStep('summary');
            success(`Complete DS Excel import finished successfully!`);
        } catch (err: any) {
            console.error("Critical error during Excel import:", err);
            toastError("Import process halted: " + (err?.message || err));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 max-w-3xl w-full shadow-2xl overflow-hidden my-8 animate-fade-in flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                            <ArrowUpTrayIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Import Complete Driving School Excel
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                Restore, sync, or migrate full driving school datasets from spreadsheets (.xlsx)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm disabled:opacity-50"
                        title="Close Modal"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-3xl p-10 flex flex-col items-center justify-center text-center group cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/20 relative">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                                    <ArrowUpTrayIcon className="w-8 h-8" />
                                </div>
                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {isParsing ? 'Inspecting Excel File...' : 'Drop your Excel Spreadsheet here'}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium mt-1 max-w-md">
                                    Upload a Master Multi-Sheet Workbook or individual sheets. Supports .xlsx and .xls formats.
                                </p>
                                <span className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-xl border border-indigo-200 dark:border-indigo-800">
                                    Browse Computer Files
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                                <SparklesIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                    <strong className="text-slate-800 dark:text-slate-200">Smart Dataset Auto-Detection:</strong> The importer automatically recognizes sheets named <em>Students, Invoices, Receipts, License Categories, Fee Voteheads, and System Users</em> or maps table headers automatically.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Review Detected Datasets */}
                    {step === 'review' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Detected Datasets in File ({detectedDatasets.length})
                                    </h4>
                                    <p className="text-xs text-slate-400 font-medium">
                                        Select the operational datasets you want to import into {currentInstitution?.name || 'this school'}.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="updateExisting"
                                        checked={updateExisting}
                                        onChange={(e) => setUpdateExisting(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor="updateExisting" className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                        Update existing records
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {detectedDatasets.map(d => {
                                    const IconComponent = d.icon;
                                    return (
                                        <div 
                                            key={d.id}
                                            onClick={() => toggleDatasetSelection(d.id)}
                                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                                                d.selected 
                                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/80 shadow-xs' 
                                                    : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={d.selected}
                                                    onChange={() => {}}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                                                />
                                                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-200/60 dark:border-slate-700 shadow-xs">
                                                    <IconComponent className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                        {d.title}
                                                    </h5>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        Sheet: <span className="font-bold text-slate-600 dark:text-slate-300">{d.sheetName}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 shadow-xs">
                                                {d.rows.length} Records
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => {
                                        setStep('upload');
                                        setFile(null);
                                    }}
                                    className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Select Another File
                                </button>
                                <button
                                    onClick={handleExecuteImport}
                                    disabled={!detectedDatasets.some(d => d.selected)}
                                    className="px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                    Import Selected Data
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Importing */}
                    {step === 'importing' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 animate-pulse border border-indigo-200 dark:border-indigo-800">
                                <ArrowUpTrayIcon className="w-8 h-8 animate-bounce" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Importing Driving School Data...
                                </h4>
                                <p className="text-xs text-slate-400 font-medium">
                                    {progressText}
                                </p>
                            </div>
                            <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700">
                                <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {progressPercent}% Completed — Please do not close this window
                            </span>
                        </div>
                    )}

                    {/* Step 4: Summary */}
                    {step === 'summary' && (
                        <div className="space-y-6">
                            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                                    <CheckCircleIcon className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-tight">
                                        Import Completed Successfully!
                                    </h4>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                                        All selected datasets have been integrated into {currentInstitution?.name || 'this school'}.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { label: 'Students Created', val: importStats.studentsCreated, color: 'text-indigo-600' },
                                    { label: 'Students Updated', val: importStats.studentsUpdated, color: 'text-blue-600' },
                                    { label: 'Invoices Posted', val: importStats.invoicesCreated, color: 'text-cyan-600' },
                                    { label: 'Receipts Recorded', val: importStats.receiptsCreated, color: 'text-emerald-600' },
                                    { label: 'Categories Configured', val: importStats.categoriesMerged, color: 'text-purple-600' },
                                    { label: 'Staff / Instructors', val: importStats.instructorsCreated, color: 'text-amber-600' },
                                ].map((stat, i) => (
                                    <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                                        <div className={`text-xl font-black ${stat.color}`}>
                                            {stat.val}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {importStats.errors.length > 0 && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl">
                                    <h5 className="text-xs font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-2">
                                        Warnings / Skipped ({importStats.errors.length})
                                    </h5>
                                    <div className="max-h-28 overflow-y-auto custom-scrollbar text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
                                        {importStats.errors.slice(0, 10).map((err, i) => (
                                            <div key={i}>• {err}</div>
                                        ))}
                                        {importStats.errors.length > 10 && (
                                            <div>...and {importStats.errors.length - 10} more</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md"
                                >
                                    Done &amp; View Data
                                </button>
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
};
