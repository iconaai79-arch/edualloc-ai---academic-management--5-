import type { Institution, User } from '../types';
import type { LeavingCertificateTemplateType, LeavingCertificateFormData } from '../types/leavingCertificate';

export interface CertificateTemplateMeta {
    id: LeavingCertificateTemplateType;
    label: string;
    description: string;
    ministryHeader: string;
    assessmentTitle: string;
    certificateTitle: string;
    idBoxLabel: string;
    defaultCourse: string;
    defaultEntryGrade: string;
    defaultExitGrade: string;
}

export const LEAVING_CERTIFICATE_TEMPLATES: Record<LeavingCertificateTemplateType, CertificateTemplateMeta> = {
    jss: {
        id: 'jss',
        label: 'Junior Secondary (JSS / CBC Transition)',
        description: 'Official CBC Transition Leaving Certificate with Core Competencies, Social Conduct & CSL reporting.',
        ministryHeader: 'MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY',
        assessmentTitle: 'KENYA PRIMARY SCHOOL EDUCATION ASSESSMENT / JUNIOR SECONDARY',
        certificateTitle: 'TRANSITION LEAVING CERTIFICATE',
        idBoxLabel: 'ASS. NO.',
        defaultCourse: 'JUNIOR SECONDARY EDUCATION (CBC)',
        defaultEntryGrade: 'GRADE 7',
        defaultExitGrade: 'GRADE 9'
    },
    primary: {
        id: 'primary',
        label: 'Primary School (Kenya Primary Certificate)',
        description: 'Official Kenya Primary School Leaving Certificate with Ability, Industry, Conduct & Co-Curricular reports.',
        ministryHeader: 'REPUBLIC OF KENYA',
        assessmentTitle: 'MINISTRY OF EDUCATION, SCIENCE AND TECHNOLOGY',
        certificateTitle: 'Kenya Primary School Leaving Certificate',
        idBoxLabel: 'Admission No.',
        defaultCourse: 'CLASS 8',
        defaultEntryGrade: 'CLASS 1',
        defaultExitGrade: 'CLASS 8'
    },
    secondary: {
        id: 'secondary',
        label: 'Secondary School (KCSE)',
        description: 'Kenya Certificate of Secondary Education Leaving Certificate with Clubs, Sports & Leadership reports.',
        ministryHeader: 'REPUBLIC OF KENYA — MINISTRY OF EDUCATION',
        assessmentTitle: 'KENYA CERTIFICATE OF SECONDARY EDUCATION',
        certificateTitle: 'SECONDARY SCHOOL LEAVING CERTIFICATE',
        idBoxLabel: 'INDEX NO. / UPI',
        defaultCourse: 'KENYA CERTIFICATE OF SECONDARY EDUCATION (KCSE)',
        defaultEntryGrade: 'FORM 1',
        defaultExitGrade: 'FORM 4'
    }
};

/**
 * Determine the most suitable default template based on institution configuration
 */
export const detectDefaultTemplate = (institution?: Institution | null): LeavingCertificateTemplateType => {
    if (!institution) return 'jss';
    const text = `${institution.name || ''} ${institution.category || ''} ${institution.institutionType || ''} ${institution.businessSubType || ''}`.toLowerCase();
    
    if (text.includes('junior') || text.includes('jss') || text.includes('comprehensive')) {
        return 'jss';
    }
    if (text.includes('secondary') || text.includes('high') || text.includes('girls') || text.includes('boys')) {
        return 'secondary';
    }
    if (text.includes('primary') || text.includes('academy') || text.includes('nursery')) {
        return 'primary';
    }
    return 'jss';
};

/**
 * Generate an official Certificate Serial Number
 */
export const generateCertificateSerial = (sequenceIndex = 1, prefix = 'CERT'): string => {
    const year = new Date().getFullYear();
    const padded = String(sequenceIndex).padStart(4, '0');
    return `${prefix}/${year}/${padded}`;
};

/**
 * Curated Kenyan CBC Core Competency Presets
 */
export const CBC_COMPETENCY_PRESETS = [
    "Demonstrated exemplary communication and collaboration skills, critical thinking, problem-solving abilities, imagination and creativity, and sound digital literacy across all CBC learning areas.",
    "Showed commendable self-efficacy, active learning inquiry, critical thinking in mathematical and scientific investigations, and productive teamwork in cooperative tasks.",
    "Exhibited outstanding digital literacy, citizenship values, problem solving in practical projects, and articulate oral and written communication.",
    "Maintained consistent progress in all core competencies with particular strength in creative arts, analytical reasoning, and peer collaboration."
];

/**
 * Curated Social / Behaviour Presets
 */
export const SOCIAL_BEHAVIOUR_PRESETS = [
    "A well-disciplined, courteous, and dependable learner who upheld high moral integrity, respected teachers, and maintained cordial relations with peers.",
    "Exemplary conduct throughout; polite, honest, punctual, and displayed positive social adjustment and school leadership.",
    "Quiet, hardworking, respectful to school authority, and committed to harmonious interpersonal relationships.",
    "Energetic, cooperative, demonstrates sound emotional maturity and positive social responsibility."
];

/**
 * Curated Community Service Learning (CSL) Presets
 */
export const CSL_PARTICIPATION_PRESETS = [
    "Actively spearheaded the school environmental greening and tree adoption initiative, community clean-up exercise, and peer academic mentoring programme.",
    "Participated enthusiastically in the school vegetable kitchen garden project, soil conservation campaign, and community elder visitation initiative.",
    "Demonstrated strong commitment in water conservation awareness, hygiene sensitization, and institutional resource recycling programmes.",
    "Engaged passionately in community health promotion, library book donation drives, and primary school reading mentorship."
];

/**
 * Secondary Extracurricular & Responsibility Presets
 */
export const SECONDARY_SPORTS_CLUBS_PRESETS = {
    sports: [
        "Active member of the School Football and Athletics teams; represented the school up to County level with great sportsmanship.",
        "Member of the Volleyball team and Badminton club; displayed remarkable discipline and team spirit.",
        "Participated actively in Inter-house Track and Field events, Rugby, and Table Tennis tournaments."
    ],
    clubs: [
        "Chairman of the Science & Robotics Club, active member of the Kenya Red Cross Society and Presidential Award Scheme.",
        "Key debater in the Journalism & Debating Society, Environmental Club member, and Christian Union choir leader.",
        "Active member of the Scouts Movement, St. John Ambulance, and Agriculture Young Farmers Club."
    ],
    responsibilities: [
        "Served diligently as School Captain / Senior Prefect with exemplary dedication and leadership.",
        "House Captain and Dining Hall Prefect; managed responsibilities with fairness and integrity.",
        "Class Secretary and Library Assistant; carried out duties punctually and effectively."
    ]
};

/**
 * Primary School Ability, Industry & Conduct Presets (Kenya Primary Certificate)
 */
export const PRIMARY_REPORT_PRESETS = [
    "A diligent, industrious and well-mannered pupil who demonstrated high academic ability, keen attention in class lessons, and exemplary conduct at all times.",
    "Shows commendable intellectual ability and perseverance. Maintained high moral discipline, respected school authority, and was cooperative with fellow peers.",
    "Hardworking, honest, and reliable. Displayed steady academic industry, a pleasant disposition, and admirable leadership qualities.",
    "Consistently demonstrated sound academic ability and positive effort. Upheld high standards of school discipline, integrity, and courteous conduct."
];

/**
 * Primary School Co-Curricular Presets (Kenya Primary Certificate)
 */
export const PRIMARY_CO_CURRICULAR_PRESETS = [
    "Participated actively in Athletics and School Football; dedicated member of the Music & Drama Club and Scouts Movement.",
    "Active member of the School Choir, Environmental Green Club, and Volleyball team; exhibited great team spirit and sportsmanship.",
    "Competed enthusiastically in Netball, Inter-House Track events, and the Young Farmers Agriculture Club.",
    "Represented the school in Zonal Athletics competitions, Table Tennis, and the St. John Ambulance Brigade."
];

