export interface IELTSReadingPassage {
    id: string;
    title: string;
    moduleType: 'Academic' | 'General Training';
    passageText: string;
    questions: {
        id: string;
        type: 'TFNG' | 'MCQ' | 'MATCHING_HEADINGS';
        questionText: string;
        options?: string[];
        correctAnswer: string;
        explanation: string;
    }[];
}

export interface IELTSWritingPrompt {
    id: string;
    taskType: 'Task 1' | 'Task 2';
    moduleType: 'Academic' | 'General Training';
    title: string;
    promptText: string;
    minimumWords: number;
    sampleModelAnswerBand8: string;
    keyVocabulary: string[];
}

export interface IELTSSpeakingCueCard {
    id: string;
    part: 1 | 2 | 3;
    topic: string;
    cuePoints: string[];
    prepTimeSec: number;
    speakTimeSec: number;
    sampleBand8Response: string;
}

export const SAMPLE_READING_PASSAGES: IELTSReadingPassage[] = [
    {
        id: 'read_1',
        title: 'The Evolution of Artificial Intelligence in Healthcare',
        moduleType: 'Academic',
        passageText: `Artificial Intelligence (AI) is transforming modern diagnostic medicine. Machine learning algorithms trained on millions of medical images can now detect early-stage retinal diseases and pulmonary nodules with accuracy exceeding 94%. In tertiary hospital settings across East Africa, AI-assisted diagnostic triaging allows radiologists to prioritize critical cases within minutes rather than hours.

However, clinical adoption faces challenges concerning data privacy and algorithmic bias. Most training datasets originate from Western demographic populations, leading to potential discrepancies when deployed in diverse global settings. Medical ethicists emphasize the necessity of human-in-the-loop validation, ensuring that AI tools serve as decision-support systems rather than autonomous diagnostic replacements.`,
        questions: [
            {
                id: 'q1',
                type: 'TFNG',
                questionText: 'Machine learning algorithms can detect retinal diseases with over 90% accuracy.',
                options: ['TRUE', 'FALSE', 'NOT GIVEN'],
                correctAnswer: 'TRUE',
                explanation: 'The passage explicitly states accuracy exceeds 94%.'
            },
            {
                id: 'q2',
                type: 'TFNG',
                questionText: 'AI tools are intended to completely replace human radiologists in East Africa.',
                options: ['TRUE', 'FALSE', 'NOT GIVEN'],
                correctAnswer: 'FALSE',
                explanation: 'The passage states AI serves as decision-support rather than autonomous diagnostic replacements.'
            }
        ]
    }
];

export const SAMPLE_WRITING_PROMPTS: IELTSWritingPrompt[] = [
    {
        id: 'writ_task2_1',
        taskType: 'Task 2',
        moduleType: 'Academic',
        title: 'Technology and Higher Education',
        promptText: 'Some people believe that online learning will completely replace traditional university lectures in the near future. To what extent do you agree or disagree with this statement?',
        minimumWords: 250,
        sampleModelAnswerBand8: `It is argued by some that online education will eventually supplant conventional university lectures. While virtual learning offers unprecedented flexibility and access, I firmly disagree that it will completely replace physical higher education institutions due to the indispensable value of collaborative campus environments and hands-on laboratory work.

On the one hand, digital learning platforms have democratized higher education. Students across the globe can now access lecture materials, research journals, and interactive seminars from prestigious institutions without relocating. Furthermore, recorded lectures allow individuals to learn at their own pace, making education more accessible for working professionals.

On the other hand, traditional universities provide crucial pedagogical benefits that digital interfaces cannot replicate. Firstly, face-to-face interaction fosters deep intellectual debate, interpersonal skills, and immediate academic feedback from faculty. Secondly, practical disciplines such as medicine, engineering, and scientific research require physical laboratory access and specialized equipment that virtual simulations cannot fully emulate.

In conclusion, although online learning will continue to enhance academic flexibility, it will act as a complementary model rather than a total replacement for traditional universities.`,
        keyVocabulary: ['supplant', 'democratized', 'pedagogical', 'emulate', 'unprecedented flexibility', 'complementary model']
    },
    {
        id: 'writ_task1_1',
        taskType: 'Task 1',
        moduleType: 'Academic',
        title: 'Bar Chart — Energy Consumption Trends',
        promptText: 'The bar chart below shows the percentage of electricity generated from renewable sources in four countries between 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        minimumWords: 150,
        sampleModelAnswerBand8: `The bar chart compares the proportion of electricity produced from renewable energy sources across four nations over a ten-year period from 2010 to 2020.

Overall, all four countries experienced an increase in renewable energy adoption, with Country A demonstrating the most substantial growth, whereas Country D maintained the lowest percentage throughout the decade.

In 2010, Country B led with 35% of its electricity generated from renewables, followed by Country A at 20%. Over the subsequent decade, Country A witnessed a dramatic upward trend, reaching 65% by 2020 and becoming the leading producer. In contrast, Country B showed moderate steady growth, concluding at 50%.

Meanwhile, Country C began at 15% in 2010 and doubled its output to 30% by 2020. Country D registered the lowest initial figure at 5% and experienced minimal fluctuation, ending the period at 12%.`,
        keyVocabulary: ['proportion', 'substantial growth', 'upward trend', 'moderate steady growth', 'minimal fluctuation']
    }
];

export const SAMPLE_SPEAKING_CUE_CARDS: IELTSSpeakingCueCard[] = [
    {
        id: 'spk_cue_1',
        part: 2,
        topic: 'Describe a technology or tool that helps you learn or study efficiently',
        cuePoints: [
            'What the technology or tool is',
            'How often you use it',
            'How it helps you in your studies',
            'And explain why you find it particularly beneficial'
        ],
        prepTimeSec: 60,
        speakTimeSec: 120,
        sampleBand8Response: `One technological tool that has revolutionized my study routine is an AI-powered digital flashcard and spaced repetition application. I use it on a daily basis, particularly when preparing for intensive academic examinations.

The tool works by utilizing a spaced repetition algorithm that schedules flashcards based on how well I recall information. For complex concepts in medical terminology or vocabulary, the app presents challenging cards more frequently while spacing out items I have mastered.

I find it exceptionally beneficial because it maximizes learning efficiency. Instead of spending hours passively re-reading notes, it forces active recall, which drastically improves long-term memory retention. Furthermore, it synchronizes across my mobile phone and laptop, enabling me to review study decks during my daily commute.`
    }
];

/**
 * Calculates raw score to IELTS Band Score conversion
 */
export function calculateIELTSListeningReadingBand(rawScore: number): number {
    if (rawScore >= 39) return 9.0;
    if (rawScore >= 37) return 8.5;
    if (rawScore >= 35) return 8.0;
    if (rawScore >= 33) return 7.5;
    if (rawScore >= 30) return 7.0;
    if (rawScore >= 27) return 6.5;
    if (rawScore >= 23) return 6.0;
    if (rawScore >= 19) return 5.5;
    if (rawScore >= 15) return 5.0;
    if (rawScore >= 12) return 4.5;
    if (rawScore >= 9) return 4.0;
    return 3.5;
}
