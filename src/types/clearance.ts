export interface ClearanceItem {
    sNo: number;
    subjectArea: string;
    teacherId?: string;
    teacherName: string;
    itemLostOrDamaged: string;
    fineAmount?: number;
    signature: string;
    status: 'pending' | 'cleared' | 'flagged';
    signedAt?: string;
}

export interface StudentClearanceRecord {
    id: string;
    institutionId: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    assessmentNo: string; // ASS. NO. from form
    grade: string;        // GRADE
    year: string;         // YEAR
    status: 'draft' | 'in_progress' | 'cleared' | 'flagged' | 'rejected';

    // 16 Standard Subject/Area Clearances (matching Junior School Clearance Form)
    clearanceItems: ClearanceItem[];

    // Automated Library Audit State
    libraryCheck: {
        status: 'cleared' | 'pending_returns' | 'unpaid_fines';
        unreturnedBooks: Array<{ bookId: string; title: string; dueDate?: string }>;
        outstandingFines: number;
        checkedAt: string;
    };

    // PTA & Finance Section
    ptaSection: {
        totalAmountOwed: number; // "Total amount owed to the school (kshs)"
        bursarName?: string;
        bursarSignature?: string;
        signedAt?: string;
    };

    // Principal / Deputy Principal Approval
    principalApproval: {
        releaseOfDocuments: 'yes' | 'no' | 'pending';
        comments: string;
        signeeName: string;
        signature: string;
        officialStampUrl?: string;
        date: string;
    };

    alumniEnrolled?: boolean;
    alumniMemberId?: string;
    createdAt: string;
    updatedAt: string;
}

export const DEFAULT_CLEARANCE_AREAS: Array<{ sNo: number; subjectArea: string; defaultTeacherRole?: string }> = [
    { sNo: 1,  subjectArea: 'English', defaultTeacherRole: 'subject_teacher' },
    { sNo: 2,  subjectArea: 'Kiswahili', defaultTeacherRole: 'subject_teacher' },
    { sNo: 3,  subjectArea: 'Mathematics', defaultTeacherRole: 'subject_teacher' },
    { sNo: 4,  subjectArea: 'Integrated science', defaultTeacherRole: 'subject_teacher' },
    { sNo: 5,  subjectArea: 'Agriculture', defaultTeacherRole: 'subject_teacher' },
    { sNo: 6,  subjectArea: 'Pre technical', defaultTeacherRole: 'subject_teacher' },
    { sNo: 7,  subjectArea: 'Creative arts', defaultTeacherRole: 'subject_teacher' },
    { sNo: 8,  subjectArea: 'Social studies', defaultTeacherRole: 'subject_teacher' },
    { sNo: 9,  subjectArea: 'C.R.E', defaultTeacherRole: 'subject_teacher' },
    { sNo: 10, subjectArea: 'I.R.E', defaultTeacherRole: 'subject_teacher' },
    { sNo: 11, subjectArea: 'ICT', defaultTeacherRole: 'subject_teacher' },
    { sNo: 12, subjectArea: 'Laboratory', defaultTeacherRole: 'lab_technician' },
    { sNo: 13, subjectArea: 'Furniture', defaultTeacherRole: 'boarding_master' },
    { sNo: 14, subjectArea: 'Games', defaultTeacherRole: 'games_master' },
    { sNo: 15, subjectArea: 'Class teacher', defaultTeacherRole: 'class_teacher' },
    { sNo: 16, subjectArea: 'Discipline master', defaultTeacherRole: 'discipline_master' },
];
