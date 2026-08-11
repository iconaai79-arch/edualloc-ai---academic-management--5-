// Comprehensive Syllabus & Curriculum Topics Dictionary (CBC & 8-4-4)
// Mapped by Subject and Grade/Form level for automatic preloading in AI generators.

export const CURRICULUM_TOPICS_DICTIONARY: Record<string, Record<string, string[]>> = {
    'Biology': {
        'Form 1': ['Classification I', 'The Cell', 'Cell Physiology', 'Nutrition in Plants and Animals'],
        'Form 2': ['Transport in Plants and Animals', 'Gaseous Exchange', 'Respiration', 'Excretion and Homeostasis'],
        'Form 3': ['Classification II', 'Ecology', 'Reproduction in Plants and Animals', 'Growth and Development'],
        'Form 4': ['Genetics & Inheritance', 'Evolution', 'Reception, Response & Coordination', 'Support & Movement in Plants & Animals'],
        'Grade 7': ['Living Things & Environment', 'Human Body Systems', 'Plant Reproduction', 'Cell Micro-biology'],
        'Grade 8': ['Excretory Systems', 'Ecosystems & Energy Flow', 'Health & Hygiene', 'Genetics Introduction'],
        'Grade 9': ['Coordination & Regulation', 'Biotechnology Basics', 'Ecological Adaptations', 'Human Reproduction'],
        'Grade 10': ['Advanced Cell Biology', 'Genetics & Genomics', 'Human Anatomy', 'Environmental Ecology']
    },
    'Mathematics': {
        'Form 1': ['Natural Numbers', 'Factors & Multiples', 'Fractions & Decimals', 'Algebraic Expressions', 'Linear Equations'],
        'Form 2': ['Quadratic Expressions', 'Logarithms & Indices', 'Trigonometry I', 'Commercial Arithmetic I', 'Surface Area & Volume'],
        'Form 3': ['Quadratic Equations & Functions', 'Approximations & Errors', 'Trigonometry II', 'Vectors', 'Binomial Expansion'],
        'Form 4': ['Matrices & Transformations', 'Probability', 'Calculus (Differentiation & Integration)', 'Three Dimensional Geometry'],
        'Grade 7': ['Whole Numbers & Decimals', 'Algebraic Expressions', 'Linear Equations', 'Angles & Triangles', 'Perimeter & Area'],
        'Grade 8': ['Ratios & Rates', 'Pythagoras Theorem', 'Quadratic Equations', 'Data Handling & Graphs', 'Probability'],
        'Grade 9': ['Trigonometric Ratios', 'Matrices Basics', 'Vectors I', 'Commercial Arithmetic II', 'Coordinate Geometry'],
        'Grade 10': ['Trigonometry & Vectors', 'Calculus Fundamentals', 'Probability & Statistics', 'Financial Mathematics']
    },
    'Chemistry': {
        'Form 1': ['Introduction to Chemistry', 'Simple Classification of Substances', 'Acids, Bases and Indicators', 'Air and Combustion', 'Water and Hydrogen'],
        'Form 2': ['Structure of the Atom and Periodic Table', 'Chemical Families', 'Structure and Bonding', 'Salts', 'Effect of Electric Current on Substances'],
        'Form 3': ['Gas Laws', 'The Mole Concept', 'Organic Chemistry I (Hydrocarbons)', 'Nitrogen and its Compounds', 'Sulphur and its Compounds'],
        'Form 4': ['Acids, Bases and Salts (Qualitative)', 'Energy Changes in Chemical Processes', 'Reaction Rates & Reversible Reactions', 'Electrochemistry', 'Metals Extraction'],
        'Grade 7': ['Matter & Mixtures', 'Acids & Bases in Daily Life', 'Air Composition', 'Water Purification'],
        'Grade 8': ['Atomic Structure', 'Chemical Reactions', 'Metals & Non-metals', 'Solutions & Solubility'],
        'Grade 9': ['Organic Compounds Introduction', 'Gas Laws', 'Electrochemistry Basics', 'Industrial Processes'],
        'Grade 10': ['Chemical Equilibrium', 'Thermochemistry', 'Electrochemistry', 'Organic Chemistry II']
    },
    'Physics': {
        'Form 1': ['Introduction to Physics', 'Measurements I', 'Force', 'Pressure', 'Particulate Nature of Matter', 'Thermal Expansion'],
        'Form 2': ['Magnetism', 'Measurements II', 'Turning Effect of Force', 'Reflection at Curved Surfaces', 'Sound', 'Fluid Flow'],
        'Form 3': ['Linear Motion', 'Refraction of Light', 'Newton’s Laws of Motion', 'Work, Energy, Power & Machines', 'Current Electricity'],
        'Form 4': ['Thin Lenses', 'Uniform Circular Motion', 'Floating and Sinking', 'Electromagnetic Spectrum', 'Electromagnetic Induction', 'Mains Electricity'],
        'Grade 7': ['Measurements & Units', 'Force & Motion', 'Simple Machines', 'Heat & Temperature'],
        'Grade 8': ['Light & Reflection', 'Sound Waves', 'Magnetism & Electricity', 'Energy Resources'],
        'Grade 9': ['Pressure in Fluids', 'Refraction & Lenses', 'Current & Voltage', 'Work & Energy'],
        'Grade 10': ['Waves & Optics', 'Electromagnetism', 'Electronics & Modern Physics', 'Newtonian Mechanics']
    },
    'English': {
        'Form 1': ['Nouns, Pronouns & Verbs', 'Comprehension & Vocabulary', 'Oral Skills & Listening', 'Functional Writing (Letters & Diaries)'],
        'Form 2': ['Tenses & Clauses', 'Summary Writing & Note Making', 'Poetry Analysis', 'Set Book Analysis I'],
        'Form 3': ['Passive & Active Voice', 'Expository Essay Writing', 'Set Book Analysis II', 'Oral Literature & Proverbs'],
        'Form 4': ['Grammar & Punctuation Review', 'Report Writing & Minutes', 'Set Book Essay Writing', 'Comprehension & Summary Mastery'],
        'Grade 7': ['Grammar & Parts of Speech', 'Reading & Vocabulary Expansion', 'Creative Writing', 'Public Speaking & Oral Skills'],
        'Grade 8': ['Sentence Structures & Clauses', 'Summary Writing', 'Poetry & Songs', 'Functional Writing'],
        'Grade 9': ['Advanced Grammar', 'Critical Reading & Essay Writing', 'Set Book Analysis', 'Debate & Persuasive Speaking'],
        'Grade 10': ['Literary Analysis & Criticism', 'Advanced Composition', 'Oratory & Rhetoric', 'Set Books Comprehensive Review']
    },
    'Kiswahili': {
        'Form 1': ['Nomino, Viwakilishi na Vitenzi', 'Kufahamu na Msamiati', 'Ushairi na Nyimbo', 'Insha za Kawaida'],
        'Form 2': ['Upatanisho wa KiSarufi', 'Ufupisho', 'Fasihi Simulizi', 'Tathmini ya Riwaya'],
        'Form 3': ['Sauti na Utamkaji', 'Tathmini ya Tamthilia', 'Insha za Kiarifa', 'Uchanganuzi wa Sentensi'],
        'Form 4': ['Sarufi na Matumizi ya Lugha', 'Insha za Barua na Ripoti', 'Uchanganuzi wa Tamthilia na Riwaya', 'Isimu Jamii'],
        'Grade 7': ['Aina za Maneno', 'Kusoma na Kufahamu', 'Insha za Ubunifu', 'Kusikiliza na Kuzungumza'],
        'Grade 8': ['Sarufi ya Kiswahili', 'Ufupisho wa Vifungu', 'Ushairi Kawaida', 'Insha za Kiofisi'],
        'Grade 9': ['Sarufi ya Kilimo na Biashara', 'Fasihi Simulizi', 'Tathmini ya Vitabu vya Seti', 'Isimu Jamii Msingi'],
        'Grade 10': ['Uchanganuzi wa Fasihi', 'Insha za Kiakademia', 'Sarufi ya Kina', 'Isimu Jamii na Mawasiliano']
    },
    'Integrated Science': {
        'Grade 7': ['Mixtures & Separation', 'Human Reproductive System', 'Elements & Compounds', 'Light & Vision'],
        'Grade 8': ['Excretory Organs', 'Chemical Reactions', 'Electrical Energy', 'Ecosystems & Biodiversity'],
        'Grade 9': ['Acid-Base Reactions', 'Forces & Motion', 'Micro-organisms', 'Genetic Traits']
    },
    'Social Studies': {
        'Grade 7': ['Physical Environment of Africa', 'Early Civilizations', 'African Empires & Trade', 'Citizenship & Governance'],
        'Grade 8': ['Climate Regions', 'Colonization of Africa', 'Human Rights & Democracy', 'Economic Activities'],
        'Grade 9': ['Global Relations', 'Constitution & Law', 'Environmental Conservation', 'Resource Management']
    },
    'Agriculture': {
        'Form 1': ['Introduction to Agriculture', 'Factors Affecting Agriculture', 'Farm Tools & Equipment', 'Soil Fertility I'],
        'Form 2': ['Crop Production I (Land Preparation)', 'Soil Fertility II (Inorganic Fertilizers)', 'Livestock Health I', 'Livestock Production I'],
        'Form 3': ['Crop Production II (Planting to Harvesting)', 'Field Crops', 'Livestock Health II (Diseases)', 'Farm Structures'],
        'Form 4': ['Livestock Production III (Selection & Breeding)', 'Agricultural Economics II', 'Farm Power & Machinery', 'Land Tenure & Land Reform']
    },
    'Business Studies': {
        'Form 1': ['Introduction to Business Studies', 'Business and its Environment', 'Satisfaction of Human Wants', 'Production', 'Entrepreneurship'],
        'Form 2': ['The Office', 'Home Trade', 'Forms of Business Units', 'Government and Business', 'Transport & Communication'],
        'Form 3': ['Warehousing', 'Insurance', 'Product Promotion', 'Demand and Supply', 'Size and Location of a Firm'],
        'Form 4': ['Financial Statements', 'Money and Banking', 'Public Finance', 'Inflation', 'International Trade']
    }
};

/**
 * Helper to fetch preloaded topics for a subject & grade level
 */
export const getPreloadedTopics = (subject: string, gradeLevel: string): string[] => {
    if (!subject || !gradeLevel) return [];
    
    // Normalize subject key
    const subjectKey = Object.keys(CURRICULUM_TOPICS_DICTIONARY).find(
        s => s.toLowerCase() === subject.toLowerCase()
    );
    if (!subjectKey) return [];

    const gradeMap = CURRICULUM_TOPICS_DICTIONARY[subjectKey];
    if (!gradeMap) return [];

    // Normalize grade key
    const gradeKey = Object.keys(gradeMap).find(
        g => g.toLowerCase() === gradeLevel.toLowerCase()
    );
    if (gradeKey) return gradeMap[gradeKey];

    // Fallback: search partial match e.g. "Form 4" or "Grade 7"
    for (const key of Object.keys(gradeMap)) {
        if (gradeLevel.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(gradeLevel.toLowerCase())) {
            return gradeMap[key];
        }
    }

    return [];
};
