export type LeavingCertificateTemplateType = 'jss' | 'primary' | 'secondary';

export interface LeavingCertificateFormData {
    certificateNo: string;
    assessmentNo: string; // "ASS. NO." or "INDEX NO."
    studentId?: string;
    studentName: string;
    admissionNumber: string;
    dateOfBirth: string;
    schoolName: string;
    enrollmentDate: string;
    entryGrade: string; // e.g. "GRADE 7", "GRADE 1", "FORM 1"
    leavingDate: string;
    exitGrade: string; // e.g. "GRADE 9", "GRADE 6", "FORM 4"
    approvedCourse: string; // e.g. "KENYA PRIMARY SCHOOL EDUCATION ASSESSMENT (KPSEA)" or "JUNIOR SECONDARY EDUCATION" or "KCSE"
    
    // CBC / JSS Specific Reporting
    coreCompetenciesAchieved: string;
    socialBehaviourReport: string;
    cslParticipation: string; // Community Service Learning

    // Primary & Secondary Traditional Reports
    academicAbility?: string;
    characterConduct?: string;
    primaryAbilityIndustryConduct?: string; // Kenya Primary: HEADTEACHER'S REPORT ON THE PUPIL'S ABILITY, INDUSTRY AND CONDUCT
    coCurricularActivities?: string; // Kenya Primary: PUPIL'S PARTICIPATION IN CO-CURRICULAR ACTIVITIES
    gamesAndSports?: string;
    clubsAndSocieties?: string;
    responsibilitiesHeld?: string; // Prefect, House Captain, etc.
    headteacherGeneralRemarks?: string;

    // Signatures & Issuance
    headteacherName: string;
    issueDate: string;
    includeOfficialStamp: boolean;
    stampDepartment?: string;
}

export interface LeavingCertificateRecord {
    id: string;
    institution_id: string;
    student_id?: string | null;
    certificate_no: string;
    assessment_no: string;
    template_type: LeavingCertificateTemplateType;
    student_name: string;
    admission_no: string;
    payload: LeavingCertificateFormData;
    headteacher_name: string;
    issue_date: string;
    status: 'draft' | 'issued' | 'archived';
    created_at?: string;
    updated_at?: string;
}
