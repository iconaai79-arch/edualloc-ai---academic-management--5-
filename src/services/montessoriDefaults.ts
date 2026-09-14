import { MontessoriAssessmentRecord } from '../types';

export const DEFAULT_COGNITIVE_MILESTONES = [
    { id: 'cog_1', description: 'Shows curiosity and eagerness to learn' },
    { id: 'cog_2', description: 'Explores and investigates surroundings' },
    { id: 'cog_3', description: 'Understands cause-and-effect relationships' },
    { id: 'cog_4', description: 'Solves simple problems independently' },
    { id: 'cog_5', description: 'Follows simple multi-step instructions' },
    { id: 'cog_6', description: 'Recognizes patterns and sequences' },
    { id: 'cog_7', description: 'Classifies objects by shape, size, or color' },
    { id: 'cog_8', description: 'Engages in imaginative and pretend play' },
    { id: 'cog_9', description: 'Remembers past experiences and relates them' },
    { id: 'cog_10', description: 'Shows sustained attention during activities' },
];

export const DEFAULT_EMOTIONAL_MILESTONES = [
    { id: 'emo_1', description: 'Expresses a range of emotions appropriately' },
    { id: 'emo_2', description: 'Recognizes and names basic feelings (happy, sad, etc.)' },
    { id: 'emo_3', description: 'Manages frustration and disappointment with support' },
    { id: 'emo_4', description: 'Adapts to changes in routine with ease' },
    { id: 'emo_5', description: 'Demonstrates self-confidence in new situations' },
    { id: 'emo_6', description: 'Shows pride in personal accomplishments' },
    { id: 'emo_7', description: 'Expresses empathy towards others\' feelings' },
    { id: 'emo_8', description: 'Accepts comfort and reassurance when upset' },
    { id: 'emo_9', description: 'Demonstrates a positive attitude towards learning' },
    { id: 'emo_10', description: 'Shows growing independence in emotional regulation' },
];

export const DEFAULT_SOCIAL_MILESTONES = [
    { id: 'soc_1', description: 'Interacts and plays cooperatively with peers' },
    { id: 'soc_2', description: 'Shares toys and materials willingly' },
    { id: 'soc_3', description: 'Takes turns during games and activities' },
    { id: 'soc_4', description: 'Demonstrates understanding of classroom rules' },
    { id: 'soc_5', description: 'Shows respect for teachers and peers' },
    { id: 'soc_6', description: 'Resolves conflicts peacefully with guidance' },
    { id: 'soc_7', description: 'Participates actively in group activities' },
    { id: 'soc_8', description: 'Shows empathy and kindness towards others' },
    { id: 'soc_9', description: 'Engages in simple conversations with friends' },
    { id: 'soc_10', description: 'Builds friendships and positive relationships' },
];

export const DEFAULT_PHYSICAL_MILESTONES = [
    { id: 'phy_1', description: 'Demonstrates gross motor skills (running, jumping, balancing)' },
    { id: 'phy_2', description: 'Coordinates hand-eye movements effectively' },
    { id: 'phy_3', description: 'Uses small muscles for fine motor tasks (holding crayons, scissors)' },
    { id: 'phy_4', description: 'Shows control and balance while moving' },
    { id: 'phy_5', description: 'Can dress and undress independently (with fasteners)' },
    { id: 'phy_6', description: 'Uses utensils appropriately during meal times' },
    { id: 'phy_7', description: 'Demonstrates spatial awareness (body in space)' },
    { id: 'phy_8', description: 'Shows awareness of personal hygiene practices' },
    { id: 'phy_9', description: 'Participates actively in outdoor play' },
    { id: 'phy_10', description: 'Displays energy and stamina throughout the day' },
];

export const DEFAULT_LANGUAGE_MILESTONES = [
    { id: 'lang_1', description: 'Expresses thoughts and ideas clearly' },
    { id: 'lang_2', description: 'Listens attentively to stories and discussions' },
    { id: 'lang_3', description: 'Follows verbal instructions accurately' },
    { id: 'lang_4', description: 'Uses expanding vocabulary in conversations' },
    { id: 'lang_5', description: 'Shows interest in books and reading materials' },
    { id: 'lang_6', description: 'Identifies letters of the alphabet (phonics)' },
    { id: 'lang_7', description: 'Understands concepts of print (left to right, top to bottom)' },
    { id: 'lang_8', description: 'Engages in emergent writing (scribbles, tracing)' },
    { id: 'lang_9', description: 'Participates in songs, rhymes, and poems' },
    { id: 'lang_10', description: 'Demonstrates comprehension through answering questions' },
];

export const DEFAULT_MATHEMATICS_MILESTONES = [
    { id: 'math_1', description: 'Counts objects with one-to-one correspondence' },
    { id: 'math_2', description: 'Recognizes and names numbers' },
    { id: 'math_3', description: 'Identifies and names basic shapes' },
    { id: 'math_4', description: 'Understands concepts of quantity (more, less, equal)' },
    { id: 'math_5', description: 'Compares objects by size, length, or weight' },
    { id: 'math_6', description: 'Sorts and categorizes objects by attributes' },
];

export const MONTESSORI_RATING_DEFINITIONS: Record<string, { label: string; color: string; desc: string }> = {
    M: { label: 'Mastered', color: 'emerald', desc: 'Consistently demonstrates milestone independently' },
    P: { label: 'Practicing', color: 'blue', desc: 'Performs skill with minimal support and developing fluency' },
    L: { label: 'Learning', color: 'amber', desc: 'Currently being instructed and guided regularly' },
    F: { label: 'First Noticed', color: 'indigo', desc: 'Emerging skill observed initially in classroom' },
    NI: { label: 'Not Introduced', color: 'slate', desc: 'Not yet part of current term focus' },
};

export const createInitialMontessoriRecord = (
    institutionId: string,
    studentId: string,
    studentName?: string,
    className?: string
): MontessoriAssessmentRecord => ({
    id: `mont_${studentId}_${Date.now()}`,
    institutionId,
    studentId,
    studentName: studentName || '',
    className: className || '',
    reportDate: new Date().toISOString().split('T')[0],
    term: 'Term 1',
    academicYear: new Date().getFullYear().toString(),
    homeroomTutors: '',
    domains: {
        cognitive: {
            domainName: 'Cognitive Development',
            milestones: DEFAULT_COGNITIVE_MILESTONES.map(m => ({ ...m, rating: 'P' })),
        },
        emotional: {
            domainName: 'Emotional Development',
            milestones: DEFAULT_EMOTIONAL_MILESTONES.map(m => ({ ...m, rating: 'P' })),
        },
        social: {
            domainName: 'Social Development',
            milestones: DEFAULT_SOCIAL_MILESTONES.map(m => ({ ...m, rating: 'P' })),
        },
        physical: {
            domainName: 'Physical Development',
            milestones: DEFAULT_PHYSICAL_MILESTONES.map(m => ({ ...m, rating: 'P' })),
        },
        languageAndLiteracy: {
            domainName: 'Language and Literacy Development',
            milestones: DEFAULT_LANGUAGE_MILESTONES.map(m => ({ ...m, rating: 'P' })),
        },
        mathematics: {
            domainName: 'Mathematics',
            milestones: DEFAULT_MATHEMATICS_MILESTONES.map(m => ({ ...m, rating: 'P' })),
        },
    },
    activities: {
        expressiveArtsAndDesign: 'Hands-on sensory art, finger painting, clay modelling, and collage craft.',
        celebrations: 'Participated enthusiastically in theme dress up days, world book day and holiday concerts.',
        languages: 'Engaged actively in introductory Kiswahili & French songs, greetings, and vocabulary.',
        sports: 'Active engagement in P.E, obstacle coordination drills, and introductory ballet / movement exercises.',
        experiments: 'Sensory water exploration, color mixing, sink & float investigations.',
        swimming: 'Water safety familiarity, leg kicking, and water confidence games.',
        otherActivities: 'Daily circle time sharing, music rhythm instruments, and Montessori sensorial table work.',
    },
    summaryNarrative: 'Has shown remarkable growth across cognitive and social-emotional domains this term. Engages positively with peers, demonstrates enthusiasm during practical life activities, and shows great curiosity during discovery sessions. A delightful learner who continues to flourish!',
});
