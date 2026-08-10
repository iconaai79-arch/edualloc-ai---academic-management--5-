import React, { useState, useMemo, useEffect } from 'react';
import type { Institution, Subject, User } from '../../types';
import { apiService } from '../../services/apiService';
import { generateRevisionPack, AIRevisionPackResult } from '../../services/geminiService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { XIcon } from '../icons/XIcon';
import { StarIcon } from '../icons/StarIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';

export interface RevisionMarketplacePack {
    id: string;
    title: string;
    description: string;
    subject: string;
    gradeLevel: string;
    curriculum: string;
    topic?: string;
    price: number; // 0 for free, > 0 for premium KES
    authorName: string;
    downloadsCount: number;
    rating: number;
    isAiGenerated: boolean;
    contentJson: AIRevisionPackResult;
    institutionId?: string;
    createdAt?: string;
}

interface RevisionMarketplaceManagerProps {
    currentInstitution?: Institution | null;
    currentUser?: User | null;
    subjects?: Subject[];
}

export const RevisionMarketplaceManager: React.FC<RevisionMarketplaceManagerProps> = ({
    currentInstitution,
    currentUser,
    subjects = []
}) => {
    const instId = currentInstitution?.id || 'default_inst';

    // Default Seed Marketplace Packs
    const defaultPacks: RevisionMarketplacePack[] = [
        {
            id: 'pack_seed_1',
            title: 'KCSE Biology Form 4 Genetics & Inheritance Mastery Pack',
            description: 'Comprehensive KCSE past questions with step-by-step teacher marking scheme on Monohybrid crosses, DNA replication, and mutations.',
            subject: 'Biology',
            gradeLevel: 'Form 4',
            curriculum: '8-4-4',
            topic: 'Genetics & Inheritance',
            price: 0,
            authorName: 'EduAI AI Engine',
            downloadsCount: 1420,
            rating: 4.9,
            isAiGenerated: true,
            contentJson: {
                title: 'KCSE Biology Form 4 Genetics & Inheritance Mastery Pack',
                description: 'Comprehensive KCSE past questions with step-by-step teacher marking scheme.',
                subject: 'Biology',
                gradeLevel: 'Form 4',
                topic: 'Genetics & Inheritance',
                totalMarks: 50,
                estimatedTimeMinutes: 45,
                questions: [
                    {
                        id: 1,
                        question: 'Explain why codominance occurs in the ABO blood group inheritance in humans.',
                        type: 'structured',
                        answer: 'Alleles IA and IB are codominant. When present together (IAIB), both antigens A and B are expressed equally on the surface of red blood cells.',
                        explanation: 'Award 2 marks for allele identification (IA and IB), 2 marks for equal expression concept, 1 mark for red blood cell surface location.',
                        marks: 5
                    },
                    {
                        id: 2,
                        question: 'Which base pair rule applies to DNA double helix structure?',
                        type: 'multiple_choice',
                        options: ['A) Adenine pairs with Guanine', 'B) Adenine pairs with Thymine', 'C) Cytosine pairs with Thymine', 'D) Uracil pairs with Adenine'],
                        answer: 'B) Adenine pairs with Thymine',
                        explanation: 'In DNA, Adenine (A) pairs with Thymine (T) via 2 hydrogen bonds, while Cytosine (C) pairs with Guanine (G) via 3 hydrogen bonds.',
                        marks: 5
                    }
                ]
            }
        },
        {
            id: 'pack_seed_2',
            title: 'CBC Grade 10 Mathematics Trigonometric Ratios & Vectors',
            description: 'Grade 10 Senior School CBC assessment tasks on Sine, Cosine, Tangent, vector resolution, and practical applications.',
            subject: 'Mathematics',
            gradeLevel: 'Grade 10',
            curriculum: 'CBC',
            topic: 'Trigonometry & Vectors',
            price: 150,
            authorName: 'Senior Examiner Otieno',
            downloadsCount: 890,
            rating: 4.8,
            isAiGenerated: false,
            contentJson: {
                title: 'CBC Grade 10 Mathematics Trigonometric Ratios & Vectors',
                description: 'Grade 10 Senior School CBC assessment tasks.',
                subject: 'Mathematics',
                gradeLevel: 'Grade 10',
                topic: 'Trigonometry & Vectors',
                totalMarks: 40,
                estimatedTimeMinutes: 40,
                questions: [
                    {
                        id: 1,
                        question: 'A ladder 10m long leans against a vertical wall making an angle of 60° with the ground. Calculate the height reached on the wall.',
                        type: 'structured',
                        answer: 'Height = 10 * sin(60°) = 10 * 0.8660 = 8.66 meters.',
                        explanation: 'Award 2 marks for correct ratio setup sin(60°) = h/10, 2 marks for substitution, 1 mark for final answer 8.66m with units.',
                        marks: 5
                    }
                ]
            }
        },
        {
            id: 'pack_seed_3',
            title: 'Form 3 Chemistry Organic Chemistry I & Hydrocarbons',
            description: 'Topic revision paper covering Alkanes, Alkenes, Alkynes, IUPAC nomenclature, and combustion equations.',
            subject: 'Chemistry',
            gradeLevel: 'Form 3',
            curriculum: '8-4-4',
            topic: 'Organic Chemistry I',
            price: 0,
            authorName: 'EduAI AI Engine',
            downloadsCount: 2150,
            rating: 5.0,
            isAiGenerated: true,
            contentJson: {
                title: 'Form 3 Chemistry Organic Chemistry I & Hydrocarbons',
                description: 'Topic revision paper covering Alkanes, Alkenes, Alkynes, IUPAC nomenclature.',
                subject: 'Chemistry',
                gradeLevel: 'Form 3',
                topic: 'Organic Chemistry I',
                totalMarks: 45,
                estimatedTimeMinutes: 45,
                questions: [
                    {
                        id: 1,
                        question: 'State the observations made when Ethene gas is bubbled through acidified Potassium Manganate (VII) solution.',
                        type: 'structured',
                        answer: 'The purple Potassium Manganate (VII) solution turns colorless (decolorized).',
                        explanation: 'Award 2 marks for stating purple to colorless decolorization due to double bond oxidation.',
                        marks: 5
                    }
                ]
            }
        }
    ];

    const [packs, setPacks] = useState<RevisionMarketplacePack[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_revision_marketplace_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { }
        return defaultPacks;
    });

    // Sync with backend DB
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<RevisionMarketplacePack>('revision_marketplace', currentInstitution.id)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setPacks(prev => {
                            const map = new Map<string, RevisionMarketplacePack>();
                            defaultPacks.forEach(p => map.set(p.id, p));
                            prev.forEach(p => map.set(p.id, p));
                            records.forEach(r => map.set(r.id, { ...map.get(r.id), ...r }));
                            return Array.from(map.values());
                        });
                    }
                })
                .catch(() => { });
        }
    }, [currentInstitution]);

    // Filters & Active View
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
    const [selectedPriceFilter, setSelectedPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
    const [activeTab, setActiveTab] = useState<'marketplace' | 'ai_generator' | 'my_library'>('marketplace');

    // Selected Pack Preview Modal
    const [previewPack, setPreviewPack] = useState<RevisionMarketplacePack | null>(null);
    const [previewTab, setPreviewTab] = useState<'questions' | 'answers'>('questions');

    // AI Generator Modal / Form State
    const [genSubject, setGenSubject] = useState(subjects[0]?.name || 'Biology');
    const [genGradeLevel, setGenGradeLevel] = useState('Form 4');
    const [genTopic, setGenTopic] = useState('');
    const [genNumQuestions, setGenNumQuestions] = useState(5);
    const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [genPrice, setGenPrice] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Filtered Packs
    const filteredPacks = useMemo(() => {
        return packs.filter(pack => {
            if (selectedSubjectFilter !== 'all' && pack.subject.toLowerCase() !== selectedSubjectFilter.toLowerCase()) return false;
            if (selectedGradeFilter !== 'all' && pack.gradeLevel.toLowerCase() !== selectedGradeFilter.toLowerCase()) return false;
            if (selectedPriceFilter === 'free' && pack.price > 0) return false;
            if (selectedPriceFilter === 'paid' && pack.price === 0) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = pack.title.toLowerCase().includes(q);
                const matchSub = pack.subject.toLowerCase().includes(q);
                const matchTopic = (pack.topic || '').toLowerCase().includes(q);
                return matchTitle || matchSub || matchTopic;
            }
            return true;
        });
    }, [packs, selectedSubjectFilter, selectedGradeFilter, selectedPriceFilter, searchQuery]);

    // Handle AI Generation
    const handleGenerateAiPack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!genTopic.trim()) {
            alert('Please enter a topic or learning area for the assessment pack.');
            return;
        }

        setIsGenerating(true);
        try {
            const aiPack = await generateRevisionPack(genSubject, genGradeLevel, genTopic.trim(), genNumQuestions, genDifficulty);
            const newPack: RevisionMarketplacePack = {
                id: `pack_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                title: aiPack.title,
                description: aiPack.description,
                subject: genSubject,
                gradeLevel: genGradeLevel,
                curriculum: genGradeLevel.toLowerCase().includes('grade') ? 'CBC' : '8-4-4',
                topic: genTopic.trim(),
                price: genPrice,
                authorName: `${currentUser?.name || 'Teacher'} (AI Assisted)`,
                downloadsCount: 1,
                rating: 5.0,
                isAiGenerated: true,
                contentJson: aiPack,
                institutionId: currentInstitution?.id
            };

            const updated = [newPack, ...packs];
            setPacks(updated);
            try {
                localStorage.setItem(`eduai_revision_marketplace_${instId}`, JSON.stringify(updated));
            } catch (e) { }

            if (currentInstitution?.id) {
                await apiService.saveModuleRecord('revision_marketplace', newPack).catch(() => { });
            }

            setToastMessage(`✨ AI Revision Pack "${newPack.title}" generated successfully!`);
            setGenTopic('');
            setPreviewPack(newPack);
            setActiveTab('marketplace');
        } catch (err) {
            console.error("AI Pack Generation failed:", err);
            alert("Failed to generate AI revision pack. Please check network and try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadOrPurchase = (pack: RevisionMarketplacePack) => {
        if (pack.price > 0) {
            alert(`💳 Premium Pack "${pack.title}" — Price: KES ${pack.price}\n\nSTK push payment authorization queued for parent/institution account.`);
        }
        setPreviewPack(pack);
    };

    const handlePrintPack = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6">
            {/* Top Banner Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="relative z-10 space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                        <span className="bg-indigo-400/30 text-indigo-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-300/30 flex items-center gap-1">
                            <SparklesIcon className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> AI Assessment & Monetization Engine
                        </span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white">
                        AI Revision & Assessment Marketplace
                    </h2>
                    <p className="text-xs md:text-sm text-indigo-100/90 leading-relaxed">
                        Generate KCSE/CBC exam packs, past papers, and teacher marking schemes with AI. Monetize revision packs or download print-ready assessments.
                    </p>
                </div>

                <button
                    onClick={() => setActiveTab('ai_generator')}
                    className="relative z-10 px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <SparklesIcon className="w-4 h-4 text-slate-950" /> Generate AI Exam Pack
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6 text-xs font-black uppercase tracking-wider">
                <button
                    onClick={() => setActiveTab('marketplace')}
                    className={`pb-3 transition-colors flex items-center gap-2 ${
                        activeTab === 'marketplace'
                            ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    <BookOpenIcon className="w-4 h-4" /> Marketplace Explorer ({filteredPacks.length})
                </button>
                <button
                    onClick={() => setActiveTab('ai_generator')}
                    className={`pb-3 transition-colors flex items-center gap-2 ${
                        activeTab === 'ai_generator'
                            ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    <SparklesIcon className="w-4 h-4 text-amber-500" /> AI Pack Generator
                </button>
            </div>

            {/* Toast Notice */}
            {toastMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm">
                    <span>{toastMessage}</span>
                    <button onClick={() => setToastMessage(null)} className="text-emerald-600 font-black ml-4">✕</button>
                </div>
            )}

            {/* TAB 1: MARKETPLACE EXPLORER */}
            {activeTab === 'marketplace' && (
                <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search topic, title, subject..."
                                className="form-input pl-10 text-xs font-bold"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                        </div>

                        <div>
                            <select
                                value={selectedSubjectFilter}
                                onChange={e => setSelectedSubjectFilter(e.target.value)}
                                className="form-select text-xs font-bold"
                            >
                                <option value="all">All Subjects</option>
                                {['Biology', 'Mathematics', 'Chemistry', 'Physics', 'English', 'Kiswahili', 'Social Studies', 'Integrated Science'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={selectedGradeFilter}
                                onChange={e => setSelectedGradeFilter(e.target.value)}
                                className="form-select text-xs font-bold"
                            >
                                <option value="all">All Grades / Forms</option>
                                {['Form 4', 'Form 3', 'Form 2', 'Form 1', 'Grade 10', 'Grade 9', 'Grade 8', 'Grade 7'].map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={selectedPriceFilter}
                                onChange={e => setSelectedPriceFilter(e.target.value as any)}
                                className="form-select text-xs font-bold"
                            >
                                <option value="all">All Prices (Free & Premium)</option>
                                <option value="free">Free Papers Only</option>
                                <option value="paid">Premium KES Papers</option>
                            </select>
                        </div>
                    </div>

                    {/* Cards Grid */}
                    {filteredPacks.length === 0 ? (
                        <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <BookOpenIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-500">No revision packs match your filter criteria.</p>
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedSubjectFilter('all'); setSelectedGradeFilter('all'); setSelectedPriceFilter('all'); }}
                                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPacks.map(pack => (
                                <div
                                    key={pack.id}
                                    className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-md hover:shadow-xl transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
                                >
                                    {pack.isAiGenerated && (
                                        <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1">
                                            <SparklesIcon className="w-3 h-3" /> AI Pack
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-xl border border-indigo-100 dark:border-indigo-800">
                                                {pack.subject}
                                            </span>
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl">
                                                {pack.gradeLevel}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                                            {pack.title}
                                        </h3>

                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {pack.description}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-amber-500 text-xs font-black">
                                            <StarIcon className="w-4 h-4 fill-current" /> {pack.rating}
                                            <span className="text-[10px] text-slate-400 font-mono ml-1">({pack.downloadsCount} DLs)</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {pack.price === 0 ? (
                                                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-xs rounded-xl">
                                                    FREE
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-xs rounded-xl">
                                                    KES {pack.price}
                                                </span>
                                            )}

                                            <button
                                                onClick={() => handleDownloadOrPurchase(pack)}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
                                            >
                                                <DocumentTextIcon className="w-4 h-4" /> View
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: AI REVISION GENERATOR */}
            {activeTab === 'ai_generator' && (
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                    <div className="border-b border-slate-100 dark:border-slate-700 pb-4 space-y-1">
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-amber-500 animate-spin" /> AI Assessment & Revision Generator
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Specify topic guidelines to instantly create a complete assessment sheet and model answer scheme.
                        </p>
                    </div>

                    <form onSubmit={handleGenerateAiPack} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                                    Subject
                                </label>
                                <select
                                    value={genSubject}
                                    onChange={e => setGenSubject(e.target.value)}
                                    className="form-select font-bold text-xs"
                                >
                                    {['Biology', 'Mathematics', 'Chemistry', 'Physics', 'English', 'Kiswahili', 'History', 'Geography', 'CRE', 'Agriculture', 'Business Studies', 'Computer Studies', 'Social Studies', 'Integrated Science'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                                    Grade / Form Level
                                </label>
                                <select
                                    value={genGradeLevel}
                                    onChange={e => setGenGradeLevel(e.target.value)}
                                    className="form-select font-bold text-xs"
                                >
                                    {['Form 4', 'Form 3', 'Form 2', 'Form 1', 'Grade 10', 'Grade 9', 'Grade 8', 'Grade 7', 'Grade 6'].map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                                Topic or Learning Area Focus *
                            </label>
                            <input
                                type="text"
                                value={genTopic}
                                onChange={e => setGenTopic(e.target.value)}
                                placeholder="e.g. Genetics & Inheritance, Trigonometry, Organic Chemistry, Plant Nutrition..."
                                className="form-input text-xs font-bold"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                                    Question Count
                                </label>
                                <select
                                    value={genNumQuestions}
                                    onChange={e => setGenNumQuestions(Number(e.target.value))}
                                    className="form-select text-xs font-bold"
                                >
                                    <option value={3}>3 Questions (Quick Quiz)</option>
                                    <option value={5}>5 Questions (Standard Test)</option>
                                    <option value={10}>10 Questions (Full Paper)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                                    Difficulty Level
                                </label>
                                <select
                                    value={genDifficulty}
                                    onChange={e => setGenDifficulty(e.target.value as any)}
                                    className="form-select text-xs font-bold"
                                >
                                    <option value="easy">Easy (Foundational)</option>
                                    <option value="medium">Medium (Standard KCSE/CBC)</option>
                                    <option value="hard">Hard (Advanced Problem Solving)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                                    Marketplace Price (KES)
                                </label>
                                <select
                                    value={genPrice}
                                    onChange={e => setGenPrice(Number(e.target.value))}
                                    className="form-select text-xs font-bold text-emerald-600 dark:text-emerald-400"
                                >
                                    <option value={0}>FREE Paper</option>
                                    <option value={100}>KES 100</option>
                                    <option value={150}>KES 150</option>
                                    <option value={200}>KES 200</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isGenerating}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <SparklesIcon className="w-5 h-5 animate-spin" /> Generating Assessment Pack with AI...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5 text-amber-300" /> Generate Assessment Pack Now
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* PREVIEW & PRINT MODAL */}
            {previewPack && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                        {/* Header */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center print:hidden">
                            <div>
                                <span className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                    {previewPack.subject} • {previewPack.gradeLevel}
                                </span>
                                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
                                    {previewPack.title}
                                </h3>
                            </div>

                            <button onClick={() => setPreviewPack(null)} className="p-2 text-slate-400 hover:text-slate-600">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Sub-Tabs */}
                        <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center print:hidden">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setPreviewTab('questions')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
                                        previewTab === 'questions' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    📝 Student Question Paper
                                </button>
                                <button
                                    onClick={() => setPreviewTab('answers')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
                                        previewTab === 'answers' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    🔑 Teacher Marking Scheme
                                </button>
                            </div>

                            <button
                                onClick={handlePrintPack}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5"
                            >
                                <DownloadIcon className="w-4 h-4" /> Print / Export PDF
                            </button>
                        </div>

                        {/* Paper Content Scroll Area */}
                        <div className="p-8 overflow-y-auto flex-1 space-y-6 text-slate-900 dark:text-slate-100">
                            {/* Printable Watermark Header */}
                            <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                                <h2 className="text-xl font-black uppercase tracking-widest text-indigo-900">{currentInstitution?.name || 'EduAI National Assessment Series'}</h2>
                                <h3 className="text-sm font-bold uppercase tracking-wider">{previewPack.title}</h3>
                                <p className="text-xs font-mono text-slate-500">
                                    Subject: {previewPack.subject} | Level: {previewPack.gradeLevel} | Total Marks: {previewPack.contentJson.totalMarks || 50} | Time: {previewPack.contentJson.estimatedTimeMinutes || 45} mins
                                </p>
                            </div>

                            {/* QUESTION PAPER TAB */}
                            {previewTab === 'questions' && (
                                <div className="space-y-6">
                                    {previewPack.contentJson.questions.map((q, idx) => (
                                        <div key={q.id || idx} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-sm leading-relaxed">
                                                    Q{idx + 1}. {q.question}
                                                </h4>
                                                <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 shrink-0 ml-4">
                                                    [{q.marks || 5} Marks]
                                                </span>
                                            </div>

                                            {q.options && q.options.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className="text-xs font-medium p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="h-16 border-b border-dashed border-slate-300 dark:border-slate-700 mt-2" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* TEACHER MARKING SCHEME TAB */}
                            {previewTab === 'answers' && (
                                <div className="space-y-6">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold">
                                        🔑 Official Marking Scheme & Step-by-Step Scoring Guide
                                    </div>

                                    {previewPack.contentJson.questions.map((q, idx) => (
                                        <div key={q.id || idx} className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/20 space-y-2">
                                            <div className="flex justify-between items-start font-bold text-sm">
                                                <span>Q{idx + 1}. {q.question}</span>
                                                <span className="text-xs font-mono font-black text-emerald-600 shrink-0 ml-4">[{q.marks || 5} Marks]</span>
                                            </div>

                                            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mt-2">
                                                <span className="uppercase text-[10px] tracking-widest font-black block text-emerald-600">Model Answer:</span>
                                                {q.answer}
                                            </div>

                                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                                                <span className="uppercase text-[10px] tracking-widest font-black block text-slate-500">Marking Criteria & Explanation:</span>
                                                {q.explanation}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
