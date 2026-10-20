import * as XLSX from 'xlsx';
import type { 
    DSStudent, 
    DSInvoice, 
    DSPayment, 
    DSLicenseCategory, 
    DSVote, 
    User, 
    DSInstructor, 
    Branch 
} from '../../types';

export interface DSExportContext {
    students: DSStudent[];
    invoices: DSInvoice[];
    payments: DSPayment[];
    categories?: DSLicenseCategory[];
    votes?: DSVote[];
    users?: User[];
    instructors?: DSInstructor[];
    branches?: Branch[];
    institutionName?: string;
}

const cleanSlug = (str?: string) => (str || 'School').replace(/[^a-zA-Z0-9_-]/g, '_');
const getTodayStr = () => new Date().toISOString().split('T')[0];

const autoFitCols = (rows: Record<string, any>[]) => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]);
    return keys.map(k => {
        let max = k.length;
        for (let i = 0; i < Math.min(rows.length, 1000); i++) {
            const v = rows[i][k];
            if (v !== null && v !== undefined) {
                const len = String(v).length;
                if (len > max) max = len;
            }
        }
        return { wch: Math.min(Math.max(max + 3, 10), 45) };
    });
};

const createSheetFromRows = (rows: Record<string, any>[]) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Status: 'No records available' }]);
    if (rows.length) {
        ws['!cols'] = autoFitCols(rows);
    }
    return ws;
};

// ----------------------------------------------------
// 1. STUDENTS EXCEL EXPORT
// ----------------------------------------------------
export const formatStudentRows = (
    students: DSStudent[] = [],
    invoices: DSInvoice[] = [],
    payments: DSPayment[] = [],
    instructors: DSInstructor[] = [],
    branches: Branch[] = []
): Record<string, any>[] => {
    return (students || []).map(s => {
        const studentId = s.id;
        const adm = s.admissionNumber || (s as any).admission_number || '';
        const name = (s.fullName || (s as any).full_name || '').trim().toLowerCase();

        // Calculate student financial summary
        const studentInvoices = invoices.filter(inv => 
            inv.studentId === studentId || 
            (adm && ((inv as any).admissionNumber || '').trim().toLowerCase() === adm.toLowerCase()) ||
            (name && (inv.studentName || '').trim().toLowerCase() === name)
        );

        const totalInvoiced = studentInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
        const totalDiscount = studentInvoices.reduce((acc, inv) => acc + Number(inv.discountAmount || (inv as any).discount_amount || 0), 0);
        const totalSponsor = studentInvoices.reduce((acc, inv) => acc + Number(inv.sponsorAmount || (inv as any).sponsor_amount || 0), 0);
        const netInvoiced = Math.max(0, totalInvoiced - totalDiscount - totalSponsor);

        const studentPayments = payments.filter(p => 
            p.studentId === studentId ||
            (adm && ((p as any).admissionNumber || '').trim().toLowerCase() === adm.toLowerCase()) ||
            (name && (p.studentName || '').trim().toLowerCase() === name) ||
            studentInvoices.some(inv => inv.id === p.invoiceId)
        );

        const validPayments = studentPayments.filter(p => p.status !== 'Pending Deletion' && p.status !== 'Cancelled' && p.status !== 'Rejected');
        const totalPaid = validPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
        const balance = Math.max(0, netInvoiced - totalPaid);

        let feeStatus = 'Pending';
        if (netInvoiced > 0 && balance <= 0) feeStatus = 'Fully Paid';
        else if (totalPaid > 0) feeStatus = 'Partially Paid';
        else if (netInvoiced === 0 && totalPaid > 0) feeStatus = 'Advance / Paid';

        const branchName = branches.find(b => b.id === (s.branchId || s.branch_id))?.name || 'Main Campus';
        const instructorName = instructors.find(i => i.id === s.preferredInstructorId)?.name || 'Unassigned';

        return {
            'Admission Number': s.admissionNumber || (s as any).admission_number || '',
            'Full Name': s.fullName || (s as any).full_name || '',
            'Phone Number': s.phone || (s as any).phoneNumber || (s as any).phone_number || '',
            'Email': s.email || '',
            'National ID / Passport': s.idNumber || s.passportNumber || '',
            'License Category': s.licenseTypeInterested || s.licenseCategory || '',
            'Course Type': s.courseType || 'Standard',
            'Status': s.status || 'Enrolled',
            'PDL Status': s.pdlStatus || 'Pending',
            'NTSA Booking Status': s.ntsaBookingStatus || 'Not Booked',
            'Theory Progress (%)': Number(s.theoryProgressPercent || 0),
            'Practical Progress (%)': Number(s.practicalProgressPercent || 0),
            'Theory Test Score': s.theoryTestScore !== undefined && s.theoryTestScore !== null ? Number(s.theoryTestScore) : '',
            'Practical Test Score': s.practicalTestScore !== undefined && s.practicalTestScore !== null ? Number(s.practicalTestScore) : '',
            'Course Duration (Days)': s.courseDurationDays || 20,
            'Preferred Hours': s.preferredLessonHours || 'Any',
            'Preferred Instructor': instructorName,
            'Branch / Campus': branchName,
            'Enrollment Date': s.enrollmentDate ? s.enrollmentDate.split('T')[0] : '',
            'Total Invoiced (KES)': netInvoiced,
            'Total Paid (KES)': totalPaid,
            'Fee Balance (KES)': balance,
            'Fee Status': feeStatus
        };
    });
};

export const exportStudentsToExcel = (
    students: DSStudent[] = [],
    invoices: DSInvoice[] = [],
    payments: DSPayment[] = [],
    instructors: DSInstructor[] = [],
    branches: Branch[] = [],
    institutionName?: string
) => {
    const rows = formatStudentRows(students, invoices, payments, instructors, branches);
    const wb = XLSX.utils.book_new();
    const ws = createSheetFromRows(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    const filename = `DS_Students_${cleanSlug(institutionName)}_${getTodayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
};

// ----------------------------------------------------
// 2. INVOICES EXCEL EXPORT
// ----------------------------------------------------
export const formatInvoiceRows = (
    invoices: DSInvoice[] = [],
    students: DSStudent[] = [],
    branches: Branch[] = []
): Record<string, any>[] => {
    return (invoices || []).map(inv => {
        const student = students.find(s => 
            s.id === inv.studentId || 
            (s.admissionNumber && s.admissionNumber.toLowerCase() === ((inv as any).admissionNumber || '').toLowerCase())
        );

        let itemsSummary = '';
        if (Array.isArray(inv.items)) {
            itemsSummary = inv.items.map(it => `${it.name || 'Fee'}: KES ${it.amount}`).join('; ');
        } else if (typeof inv.items === 'string') {
            try {
                const parsed = JSON.parse(inv.items);
                if (Array.isArray(parsed)) {
                    itemsSummary = parsed.map((it: any) => `${it.name || 'Fee'}: KES ${it.amount}`).join('; ');
                }
            } catch {
                itemsSummary = String(inv.items);
            }
        }

        const totalAmount = Number(inv.totalAmount || 0);
        const discountAmount = Number(inv.discountAmount || (inv as any).discount_amount || 0);
        const sponsorAmount = Number(inv.sponsorAmount || (inv as any).sponsor_amount || 0);
        const netPayable = Math.max(0, totalAmount - discountAmount - sponsorAmount);
        const paidAmount = Number(inv.paidAmount || 0);
        const balance = Number(inv.balance !== undefined ? inv.balance : Math.max(0, netPayable - paidAmount));
        const branchName = branches.find(b => b.id === (inv.branchId || inv.branch_id))?.name || 'Main Campus';

        return {
            'Invoice Number': inv.invoiceNumber,
            'Admission Number': student?.admissionNumber || (inv as any).admissionNumber || '',
            'Student Name': inv.studentName || student?.fullName || '',
            'License Class / Category': inv.className || '',
            'Invoice Date': inv.createdAt ? inv.createdAt.split('T')[0] : '',
            'Due Date': inv.dueDate || '',
            'Gross Amount (KES)': totalAmount,
            'Discount (KES)': discountAmount,
            'Sponsor Name': inv.sponsorName || '',
            'Sponsor Amount (KES)': sponsorAmount,
            'Net Payable (KES)': netPayable,
            'Paid Amount (KES)': paidAmount,
            'Balance (KES)': balance,
            'Status': inv.status || 'Pending',
            'Branch / Campus': branchName,
            'Fee Items': itemsSummary,
            'Notes': inv.notes || ''
        };
    });
};

export const exportInvoicesToExcel = (
    invoices: DSInvoice[] = [],
    students: DSStudent[] = [],
    branches: Branch[] = [],
    institutionName?: string
) => {
    const rows = formatInvoiceRows(invoices, students, branches);
    const wb = XLSX.utils.book_new();
    const ws = createSheetFromRows(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    const filename = `DS_Invoices_${cleanSlug(institutionName)}_${getTodayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
};

// ----------------------------------------------------
// 3. RECEIPTS (PAYMENTS) EXCEL EXPORT
// ----------------------------------------------------
export const formatReceiptRows = (
    payments: DSPayment[] = [],
    students: DSStudent[] = [],
    invoices: DSInvoice[] = [],
    branches: Branch[] = []
): Record<string, any>[] => {
    return (payments || []).map(p => {
        const student = students.find(s => 
            s.id === p.studentId || 
            (s.admissionNumber && s.admissionNumber.toLowerCase() === ((p as any).admissionNumber || '').toLowerCase())
        );

        const invoice = invoices.find(inv => inv.id === p.invoiceId || inv.invoiceNumber === p.invoiceId);
        const branchName = branches.find(b => b.id === (p.branchId || p.branch_id))?.name || 'Main Campus';

        return {
            'Receipt Number': p.receiptNumber || '',
            'Payment Date': p.paymentDate || (p.createdAt ? p.createdAt.split('T')[0] : ''),
            'Admission Number': student?.admissionNumber || (p as any).admissionNumber || '',
            'Student Name': student?.fullName || p.studentName || (invoice?.studentName || ''),
            'Linked Invoice Number': invoice?.invoiceNumber || p.invoiceId || '',
            'Amount Paid (KES)': Number(p.amount || 0),
            'Payment Method': p.paymentMethod || 'M-Pesa',
            'Transaction Reference': p.transactionReference || 'N/A',
            'Received By': p.receivedBy || 'Accounts',
            'Status': p.status || 'Completed',
            'Branch / Campus': branchName,
            'Audited By': p.auditedBy || '',
            'Audited At': p.auditedAt ? p.auditedAt.split('T')[0] : '',
            'Notes / Deletion Reason': p.deletionReason || p.notes || ''
        };
    });
};

export const exportReceiptsToExcel = (
    payments: DSPayment[] = [],
    students: DSStudent[] = [],
    invoices: DSInvoice[] = [],
    branches: Branch[] = [],
    institutionName?: string
) => {
    const rows = formatReceiptRows(payments, students, invoices, branches);
    const wb = XLSX.utils.book_new();
    const ws = createSheetFromRows(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Receipts');
    const filename = `DS_Receipts_${cleanSlug(institutionName)}_${getTodayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
};

// ----------------------------------------------------
// 4. LICENSE CATEGORIES EXCEL EXPORT
// ----------------------------------------------------
const DEFAULT_CATEGORIES: DSLicenseCategory[] = [
    { id: 'cat_a1', code: 'A1', name: 'Light Passenger Craft (Moped)', baseFee: 6500, description: 'Up to 50cc lightweight motorcycles.', parentCategory: 'Driving', isActive: true },
    { id: 'cat_b', code: 'B', name: 'Light Passenger Vehicle (Car)', baseFee: 15000, description: 'Standard light vehicles (Manual/Automatic).', parentCategory: 'Driving', isActive: true },
    { id: 'cat_c1', code: 'C1', name: 'Light Commercial Vehicle', baseFee: 18500, description: 'Commercial vehicle exceeding 3,500kg up to 7,500kg.', parentCategory: 'Driving', isActive: true },
    { id: 'cat_c', code: 'C', name: 'Heavy Commercial Vehicle', baseFee: 22000, description: 'Large multi-axle freight trucks.', parentCategory: 'Driving', isActive: true },
    { id: 'cat_e', code: 'E', name: 'Special Purpose Vehicle', baseFee: 25000, description: 'Tractors, heavy machinery, or specialized carriers.', parentCategory: 'Driving', isActive: true }
];

export const formatCategoryRows = (
    categories?: DSLicenseCategory[]
): Record<string, any>[] => {
    const source = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
    return source.map(c => ({
        'Category Code': c.code,
        'Category Name': c.name,
        'Base Tuition Fee (KES)': Number(c.baseFee ?? c.price ?? 0),
        'Parent Category': c.parentCategory || 'Driving',
        'Status': c.isActive !== false ? 'Active' : 'Inactive',
        'Description': c.description || '',
        'Curriculum Lessons Count': Array.isArray(c.dailyProgram) ? c.dailyProgram.length : 0,
        'Curriculum Topics Outline': Array.isArray(c.dailyProgram)
            ? c.dailyProgram.map(d => `Day ${d.day}: ${d.topic}`).join('; ')
            : ''
    }));
};

export const exportCategoriesToExcel = (
    categories?: DSLicenseCategory[],
    institutionName?: string
) => {
    const rows = formatCategoryRows(categories);
    const wb = XLSX.utils.book_new();
    const ws = createSheetFromRows(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'License Categories');
    const filename = `DS_License_Categories_${cleanSlug(institutionName)}_${getTodayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
};

// ----------------------------------------------------
// 5. FEE VOTEHEADS EXCEL EXPORT
// ----------------------------------------------------
const DEFAULT_VOTES: DSVote[] = [
    { id: 'vt_1', institutionId: 'default', voteName: 'Tuition Fee', defaultAmount: 12000, isMandatory: true },
    { id: 'vt_2', institutionId: 'default', voteName: 'Registration Fee', defaultAmount: 1500, isMandatory: true },
    { id: 'vt_3', institutionId: 'default', voteName: 'NTSA Test Booking Fee', defaultAmount: 3500, isMandatory: true },
    { id: 'vt_4', institutionId: 'default', voteName: 'Driving Assessment Fee', defaultAmount: 2000, isMandatory: false },
    { id: 'vt_5', institutionId: 'default', voteName: 'First Aid Training Fee', defaultAmount: 1000, isMandatory: false },
    { id: 'vt_6', institutionId: 'default', voteName: 'Student ID & Logbook', defaultAmount: 800, isMandatory: false }
];

export const formatVoteheadRows = (
    votes?: DSVote[]
): Record<string, any>[] => {
    const source = (votes && votes.length > 0) ? votes : DEFAULT_VOTES;
    return source.map(v => ({
        'Fee Votehead Name': v.voteName || (v as any).vote_name || '',
        'Default Amount (KES)': Number(v.defaultAmount ?? (v as any).default_amount ?? 0),
        'Mandatory Assessment': (v.isMandatory || (v as any).is_mandatory) ? 'Yes' : 'No',
        'Votehead ID': v.id || '',
        'Created Date': v.createdAt ? v.createdAt.split('T')[0] : ''
    }));
};

export const exportVoteheadsToExcel = (
    votes?: DSVote[],
    institutionName?: string
) => {
    const rows = formatVoteheadRows(votes);
    const wb = XLSX.utils.book_new();
    const ws = createSheetFromRows(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Fee Voteheads');
    const filename = `DS_Fee_Voteheads_${cleanSlug(institutionName)}_${getTodayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
};

// ----------------------------------------------------
// 6. SYSTEM USERS & STAFF EXCEL EXPORT
// ----------------------------------------------------
export const formatSystemUserRows = (
    users: User[] = [],
    instructors: DSInstructor[] = [],
    branches: Branch[] = []
): Record<string, any>[] => {
    // Map existing users
    const userRows = (users || []).map(u => {
        const branchName = branches.find(b => b.id === (u as any).branchId || b.id === (u as any).branch_id)?.name || 'All Campuses';
        const role = u.role || 'Staff';
        const additionalRoles = Array.isArray(u.roles) ? u.roles.join(', ') : '';

        // Check if user is linked to an instructor profile
        const linkedInstructor = (instructors || []).find(i => 
            i.id === u.id || 
            (i.email && i.email.toLowerCase() === (u.email || '').toLowerCase()) ||
            (i.phone && i.phone === u.phoneNumber)
        );

        return {
            'Full Name': u.name || (u as any).fullName || '',
            'Email Address': u.email || '',
            'Phone Number': u.phoneNumber || (u as any).phone || '',
            'Primary Role': role,
            'Additional Roles': additionalRoles,
            'Staff / Employee ID': u.staffId || u.code || u.pfNumber || '',
            'National ID': u.nationalId || '',
            'Gender': u.gender || '',
            'Branch / Campus': branchName,
            'Specialization / Skills': linkedInstructor?.specialization || (Array.isArray(u.expertise) ? u.expertise.join(', ') : '') || '',
            'Driver / Instructor Type': linkedInstructor?.instructorType || u.driverType || '',
            'Status': (u as any).status || linkedInstructor?.status || 'Active'
        };
    });

    // Append any instructors who might not yet have a direct User record
    const existingEmails = new Set(userRows.map(r => r['Email Address']?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set(userRows.map(r => r['Phone Number']).filter(Boolean));

    (instructors || []).forEach(inst => {
        if (
            (inst.email && existingEmails.has(inst.email.toLowerCase())) ||
            (inst.phone && existingPhones.has(inst.phone))
        ) {
            return;
        }

        const branchName = branches.find(b => b.id === (inst.branchId || (inst as any).branch_id))?.name || 'Main Campus';
        userRows.push({
            'Full Name': inst.name,
            'Email Address': inst.email || '',
            'Phone Number': inst.phone || '',
            'Primary Role': 'Driving Instructor',
            'Additional Roles': '',
            'Staff / Employee ID': inst.licenseNumber || inst.id,
            'National ID': '',
            'Gender': '',
            'Branch / Campus': branchName,
            'Specialization / Skills': inst.specialization || 'Driving Trainer',
            'Driver / Instructor Type': inst.instructorType || 'Driving Instructor',
            'Status': inst.status || 'Active'
        });
    });

    return userRows;
};

export const exportSystemUsersToExcel = (
    users: User[] = [],
    instructors: DSInstructor[] = [],
    branches: Branch[] = [],
    institutionName?: string
) => {
    const rows = formatSystemUserRows(users, instructors, branches);
    const wb = XLSX.utils.book_new();
    const ws = createSheetFromRows(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'System Users');
    const filename = `DS_System_Users_${cleanSlug(institutionName)}_${getTodayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
};

// ----------------------------------------------------
// 7. ALL-IN-ONE MULTI-SHEET WORKBOOK EXPORT
// ----------------------------------------------------
export const exportAllDSToExcel = (ctx: DSExportContext) => {
    const wb = XLSX.utils.book_new();

    // 1. Students
    const studentRows = formatStudentRows(
        ctx.students,
        ctx.invoices,
        ctx.payments,
        ctx.instructors || [],
        ctx.branches || []
    );
    XLSX.utils.book_append_sheet(wb, createSheetFromRows(studentRows), 'Students');

    // 2. Invoices
    const invoiceRows = formatInvoiceRows(
        ctx.invoices,
        ctx.students,
        ctx.branches || []
    );
    XLSX.utils.book_append_sheet(wb, createSheetFromRows(invoiceRows), 'Invoices');

    // 3. Receipts
    const receiptRows = formatReceiptRows(
        ctx.payments,
        ctx.students,
        ctx.invoices,
        ctx.branches || []
    );
    XLSX.utils.book_append_sheet(wb, createSheetFromRows(receiptRows), 'Receipts');

    // 4. Categories
    const categoryRows = formatCategoryRows(ctx.categories);
    XLSX.utils.book_append_sheet(wb, createSheetFromRows(categoryRows), 'License Categories');

    // 5. Voteheads
    const voteheadRows = formatVoteheadRows(ctx.votes);
    XLSX.utils.book_append_sheet(wb, createSheetFromRows(voteheadRows), 'Fee Voteheads');

    // 6. System Users
    const userRows = formatSystemUserRows(
        ctx.users || [],
        ctx.instructors || [],
        ctx.branches || []
    );
    XLSX.utils.book_append_sheet(wb, createSheetFromRows(userRows), 'System Users');

    const filename = `DS_Master_Dataset_${cleanSlug(ctx.institutionName)}_${getTodayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
};
