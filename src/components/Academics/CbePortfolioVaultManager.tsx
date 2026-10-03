import React, { useState, useEffect, useMemo } from 'react';
import type { 
    Institution, User, Subject, Course, AcademicLevel, CbeRubricLevel, CbePortfolioItem 
} from '../../types';
import { apiService } from '../../services/apiService';
import { 
    Camera, Image as ImageIcon, FileText, Video, Upload, Plus, 
    Search, Filter, Trash2, Eye, Printer, Award, CheckCircle2, 
    Sparkles, ShieldCheck, Download, Tag, X, UserCheck, Layers
} from 'lucide-react';
import { resolveRealStudentAdmNo, getDefaultGradesForInstitution, filterGradesForInstitution } from '../../utils/academicUtils';

export interface CbePortfolioVaultManagerProps {
    currentInstitution?: Institution | null;
    subjects?: Subject[];
    users?: User[]; // Contains students & teachers
    courses?: Course[];
    academicLevels?: AcademicLevel[];
    currentUser?: User;
    onLogAction?: (action: string) => Promise<void> | void;
}

// ── SAMPLE DEFAULT CBE PRACTICAL PROJECTS FOR DEMO AUDITS ──
const SAMPLE_CBE_PORTFOLIO_ITEMS: Partial<CbePortfolioItem>[] = [
    {
        id: 'port_demo_1',
        subjectName: 'Agriculture & Nutrition',
        strandName: 'CROP PRODUCTION & GARDENING',
        subStrandName: 'Constructing a Vertical Kitchen Garden',
        title: 'Vertical Bottle Sack Garden Project',
        description: 'Learner constructed a space-saving vertical garden using recycled plastic containers and organic compost for growing spinach.',
        mediaUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
        mediaType: 'image',
        rubricScore: 'EE',
        teacherComments: 'Exceeds expectation. Outstanding resourcefulness and neat structural arrangement of sack gardens.',
        uploadedAt: '2026-07-14T10:30:00Z'
    },
    {
        id: 'port_demo_2',
        subjectName: 'Science & Technology',
        strandName: 'MATTER & ENERGY',
        subStrandName: 'Solar Water Evaporation Experiment',
        title: 'Solar Water Purifier Prototype',
        description: 'Practical demonstration of water purification through solar evaporation and condensation using plastic basins.',
        mediaUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
        mediaType: 'image',
        rubricScore: 'ME',
        teacherComments: 'Meets expectation. Successfully demonstrated condensation principle and collected clean distilled water.',
        uploadedAt: '2026-07-20T14:15:00Z'
    },
    {
        id: 'port_demo_3',
        subjectName: 'Creative Arts & Crafts',
        strandName: 'VISUAL ARTS & CRAFTS',
        subStrandName: 'Pottery & Clay Modeling',
        title: 'Traditional Clay Water Vessel',
        description: 'Molded a traditional clay pot incorporating symmetrical geometric patterns and smooth surface burnishing.',
        mediaUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
        mediaType: 'image',
        rubricScore: 'EE',
        teacherComments: 'Exceeds expectation. Exceptional attention to detail, balance, and fine clay finishing techniques.',
        uploadedAt: '2026-08-02T09:00:00Z'
    }
];

export const CbePortfolioVaultManager: React.FC<CbePortfolioVaultManagerProps> = ({
    currentInstitution,
    subjects = [],
    users = [],
    courses = [],
    academicLevels = [],
    currentUser,
    onLogAction
}) => {
    const instId = currentInstitution?.id || 'default_inst';

    // Hydrated real students list from database
    const [fetchedStudents, setFetchedStudents] = useState<any[]>([]);
    const [fetchedLevels, setFetchedLevels] = useState<any[]>([]);
    const [fetchedCourses, setFetchedCourses] = useState<any[]>([]);

    useEffect(() => {
        if (currentInstitution?.id) {
            Promise.all([
                apiService.fetchModuleRecords<any>('student_enrollments', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('students', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('users', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('academic_levels', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<any>('courses', currentInstitution.id).catch(() => [])
            ]).then(([enrRecords, stRecords, userRecords, lvlRecords, courseRecords]) => {
                if (lvlRecords && lvlRecords.length > 0) setFetchedLevels(lvlRecords);
                if (courseRecords && courseRecords.length > 0) setFetchedCourses(courseRecords);

                const userById = new Map<string, any>();
                [...(stRecords || []), ...(userRecords || []), ...(users || [])].forEach(u => {
                    if (u?.id) userById.set(u.id, u);
                    if (u?.userId) userById.set(u.userId, u);
                });

                const list: any[] = [];
                const seenIds = new Set<string>();

                (enrRecords || []).forEach((enr: any) => {
                    if (!enr) return;
                    const linkedUser = (enr.userId ? userById.get(enr.userId) : null) || (enr.user_id ? userById.get(enr.user_id) : null);
                    const resolvedName =
                        (linkedUser?.name && !linkedUser.name.toLowerCase().startsWith('student ') ? linkedUser.name : null) ||
                        enr.metadata?.studentName ||
                        enr.metadata?.name ||
                        enr.metadata?.fullName ||
                        linkedUser?.name ||
                        enr.name ||
                        '';
                    const resolvedAdm = resolveRealStudentAdmNo(enr, undefined, [...(stRecords || []), ...(userRecords || []), ...(users || [])]) ||
                        resolveRealStudentAdmNo(linkedUser, undefined);
                    const resolvedClass =
                        enr.metadata?.gradeLevel || enr.metadata?.studentClass || enr.metadata?.class ||
                        linkedUser?.studentClass || linkedUser?.classLevel || linkedUser?.grade ||
                        enr.studentClass || enr.gradeLevel || enr.grade || '';

                    const idKey = enr.userId || enr.id;
                    if (idKey && !seenIds.has(idKey)) {
                        seenIds.add(idKey);
                        list.push({
                            ...enr,
                            id: idKey,
                            name: resolvedName,
                            admissionNumber: resolvedAdm !== 'N/A' ? resolvedAdm : enr.admissionNumber,
                            studentClass: resolvedClass,
                            role: 'student'
                        });
                    }
                });

                // Also include user records with role=student
                [...(stRecords || []), ...(userRecords || []), ...(users || [])].forEach(u => {
                    if (u && u.role === 'student') {
                        const idKey = u.id;
                        if (idKey && !seenIds.has(idKey)) {
                            seenIds.add(idKey);
                            const adm = resolveRealStudentAdmNo(u, undefined, enrRecords);
                            list.push({
                                ...u,
                                admissionNumber: adm !== 'N/A' ? adm : u.admissionNumber
                            });
                        }
                    }
                });

                if (list.length > 0) {
                    setFetchedStudents(list);
                }
            }).catch(() => { });
        }
    }, [currentInstitution, users]);

    // Extract all students & teachers
    const allStudents = useMemo(() => {
        if (fetchedStudents.length > 0) return fetchedStudents;
        return (users || []).filter(u => u && u.role === 'student');
    }, [users, fetchedStudents]);

    // Extract available classes across all sources
    const classList = useMemo(() => {
        const set = new Set<string>();

        // 1. Levels from props & DB
        [...(academicLevels || []), ...fetchedLevels].forEach(l => {
            if (l && l.name) set.add(l.name.trim());
        });

        // 2. Courses & Sub-streams from props & DB
        [...(courses || []), ...fetchedCourses].forEach(c => {
            if (c && c.name) {
                set.add(c.name.trim());
                (c.levels || []).forEach((l: any) => {
                    if (l && l.name) {
                        set.add(`${c.name.trim()} (${l.name.trim()})`);
                        set.add(`${c.name.trim()} ${l.name.trim()}`);
                    }
                });
            }
        });

        // 3. Classes from Enrolled Students
        allStudents.forEach(s => {
            const cl = s.studentClass || (s as any).classLevel || (s as any).class_name || (s as any).className || (s as any).class || (s as any).grade || (s as any).gradeLevel || s.metadata?.studentClass || s.metadata?.gradeLevel;
            if (cl && typeof cl === 'string' && !cl.startsWith('lvl_') && !cl.startsWith('c_')) {
                set.add(cl.trim());
            }
        });

        // 4. Ensure standard educational grades tailored to institution are available
        const defaultCBC = getDefaultGradesForInstitution(currentInstitution);
        defaultCBC.forEach(c => set.add(c));

        const configuredCourseNames = (courses || []).map((c: any) => c.name || c.title || c.code).filter(Boolean);
        const validList = filterGradesForInstitution(Array.from(set), currentInstitution, configuredCourseNames);

        // Sort smartly
        const sorted = validList.sort((a, b) => {
            const getRank = (str: string) => {
                const lower = str.toLowerCase();
                if (lower.startsWith('pp1') || lower.startsWith('playgroup')) return 1;
                if (lower.startsWith('pp2')) return 2;
                const gMatch = lower.match(/grade\s*(\d+)/);
                if (gMatch) return 10 + parseInt(gMatch[1], 10);
                const fMatch = lower.match(/form\s*(\d+)/);
                if (fMatch) return 30 + parseInt(fMatch[1], 10);
                return 50;
            };
            const rankA = getRank(a);
            const rankB = getRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return a.localeCompare(b);
        });

        return ['All Classes', ...sorted];
    }, [courses, fetchedCourses, academicLevels, fetchedLevels, allStudents]);

    const [selectedClass, setSelectedClass] = useState<string>('All Classes');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
    const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Filtered Students for selected class
    const classStudents = useMemo(() => {
        return allStudents.filter(s => {
            if (!selectedClass || selectedClass === 'All Classes' || selectedClass === 'all') return true;
            const stClass = (s.studentClass || (s as any).classLevel || (s as any).class_name || (s as any).className || (s as any).class || (s as any).grade || s.metadata?.studentClass || '').toLowerCase().trim();
            const selClean = selectedClass.toLowerCase().trim();
            return stClass === selClean || stClass.includes(selClean) || selClean.includes(stClass);
        });
    }, [allStudents, selectedClass]);

    // Local Storage & State for Portfolio Media Vault (Key: `eduai_cbe_portfolio_${instId}`)
    const [portfolioItems, setPortfolioItems] = useState<CbePortfolioItem[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_cbe_portfolio_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { }

        // Fallback sample items bound to first student if available
        const firstStudent = allStudents[0] || { id: 'st_demo_1', name: 'James Kimani' };
        return SAMPLE_CBE_PORTFOLIO_ITEMS.map((item, idx) => ({
            ...item,
            id: item.id || `port_${Date.now()}_${idx}`,
            institutionId: instId,
            studentId: firstStudent.id,
            subjectName: item.subjectName || 'Agriculture & Nutrition',
            title: item.title || 'Practical Project Evidence',
            mediaUrl: item.mediaUrl || '',
            mediaType: 'image' as const,
            uploadedAt: item.uploadedAt || new Date().toISOString()
        })) as CbePortfolioItem[];
    });

    // Modal state for uploading new project evidence
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [previewMediaModalItem, setPreviewMediaModalItem] = useState<CbePortfolioItem | null>(null);

    // Form inputs for Upload Modal
    const [formStudentId, setFormStudentId] = useState<string>('');
    const [formSubjectName, setFormSubjectName] = useState<string>('Agriculture & Nutrition');
    const [formStrandName, setFormStrandName] = useState<string>('CROP PRODUCTION & GARDENING');
    const [formSubStrandName, setFormSubStrandName] = useState<string>('Constructing a Vertical Kitchen Garden');
    const [formTitle, setFormTitle] = useState<string>('');
    const [formDescription, setFormDescription] = useState<string>('');
    const [formMediaUrl, setFormMediaUrl] = useState<string>('');
    const [formRubricScore, setFormRubricScore] = useState<CbeRubricLevel>('ME');
    const [formTeacherComments, setFormTeacherComments] = useState<string>('Meets expectation. Demonstrates solid practical understanding.');

    useEffect(() => {
        if (classStudents.length > 0 && !formStudentId) {
            setFormStudentId(classStudents[0].id);
        }
    }, [classStudents, formStudentId]);

    // Handle File Upload (convert photo image file to Data URL base64)
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                setFormMediaUrl(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    };

    // Save New Portfolio Item
    const handleSaveNewItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            alert("Please enter a Project Title.");
            return;
        }

        const newItem: CbePortfolioItem = {
            id: `port_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            institutionId: instId,
            studentId: formStudentId || classStudents[0]?.id || 'st_default',
            subjectName: formSubjectName,
            strandName: formStrandName,
            subStrandName: formSubStrandName,
            title: formTitle,
            description: formDescription,
            mediaUrl: formMediaUrl || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
            mediaType: 'image',
            rubricScore: formRubricScore,
            teacherComments: formTeacherComments,
            uploadedByTeacherId: currentUser?.id || '',
            uploadedAt: new Date().toISOString()
        };

        const updatedList = [newItem, ...portfolioItems];
        setPortfolioItems(updatedList);
        localStorage.setItem(`eduai_cbe_portfolio_${instId}`, JSON.stringify(updatedList));

        try {
            await apiService.saveModuleRecord('cbe_portfolio_items', newItem);
            onLogAction?.(`Uploaded CBE Project Evidence Portfolio: "${newItem.title}"`);
        } catch (err) { }

        // Reset form & close modal
        setFormTitle('');
        setFormDescription('');
        setFormMediaUrl('');
        setIsUploadModalOpen(false);
    };

    // Delete item
    const handleDeleteItem = (id: string) => {
        if (!window.confirm("Are you sure you want to delete this project evidence record?")) return;
        const updatedList = portfolioItems.filter(i => i.id !== id);
        setPortfolioItems(updatedList);
        localStorage.setItem(`eduai_cbe_portfolio_${instId}`, JSON.stringify(updatedList));
    };

    // Filtered Items for Display
    const filteredItems = useMemo(() => {
        return portfolioItems.filter(item => {
            const matchesStudent = selectedStudentFilter === 'all' || item.studentId === selectedStudentFilter;
            const matchesSubject = selectedSubjectFilter === 'all' || item.subjectName === selectedSubjectFilter;
            const q = searchQuery.toLowerCase();
            const matchesQuery = !q || item.title.toLowerCase().includes(q) || (item.subStrandName || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
            return matchesStudent && matchesSubject && matchesQuery;
        });
    }, [portfolioItems, selectedStudentFilter, selectedSubjectFilter, searchQuery]);

    return (
        <div className="space-y-6 text-left font-sans text-slate-900 dark:text-slate-100 no-print">
            {/* ── HERO BANNER ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-950 via-cyan-950 to-slate-950 p-6 md:p-8 text-white border border-cyan-500/30 shadow-2xl backdrop-blur-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800/50">
                                Competency Based Curriculum (CBC / CBE) • SBA e-Portfolio
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            <Camera className="w-8 h-8 text-cyan-400" />
                            <span>Learner e-Portfolio & Project Evidence Vault</span>
                        </h2>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            Store and manage photo, document, and practical evidence of School-Based Assessments (SBA) for Ministry & KNEC audits.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Upload Project Evidence</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-700 transition-all cursor-pointer"
                            title="Print KNEC Learner Evidence File"
                        >
                            <Printer className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── FILTER & SEARCH CONTROL BAR ── */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Class Selector */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Target Class</label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            {classList.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>

                    {/* Student Filter */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Filter by Learner</label>
                        <select
                            value={selectedStudentFilter}
                            onChange={e => setSelectedStudentFilter(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="all">All Learners ({classStudents.length})</option>
                            {classStudents.map(st => (
                                <option key={st.id} value={st.id}>{st.name} ({resolveRealStudentAdmNo(st, undefined, fetchedStudents)})</option>
                            ))}
                        </select>
                    </div>

                    {/* Subject Filter */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Learning Area</label>
                        <select
                            value={selectedSubjectFilter}
                            onChange={e => setSelectedSubjectFilter(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="all">All Learning Areas</option>
                            <option value="Agriculture & Nutrition">Agriculture & Nutrition</option>
                            <option value="Science & Technology">Science & Technology</option>
                            <option value="Creative Arts & Crafts">Creative Arts & Crafts</option>
                            <option value="Mathematical Activities">Mathematical Activities</option>
                            <option value="Language Activities">Language Activities</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Search Evidence</label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Filter project title..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PORTFOLIO MEDIA GALLERY GRID ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-3">
                        <Camera className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="text-base font-black uppercase text-slate-400">No Practical Project Evidence Records Found</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">Click "Upload Project Evidence" to attach practical photos or documents of learner SBA tasks.</p>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const student = allStudents.find(s => s.id === item.studentId);
                        const score = item.rubricScore || 'ME';

                        return (
                            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all">
                                {/* Photo Preview Container */}
                                <div className="relative h-48 bg-slate-950 overflow-hidden">
                                    <img
                                        src={item.mediaUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />

                                    {/* Rubric Badge */}
                                    <div className="absolute top-4 right-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-black shadow-lg ${
                                            score === 'EE' ? 'bg-emerald-500 text-white' :
                                            score === 'ME' ? 'bg-blue-600 text-white' :
                                            score === 'AE' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
                                        }`}>
                                            {score} (4)
                                        </span>
                                    </div>

                                    {/* Subject Tag */}
                                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                                        <span className="text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                                            {item.subjectName}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.title}</h4>
                                        <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">📌 Sub-Strand: {item.subStrandName || 'Practical Project'}</p>
                                        <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-2 leading-relaxed">{item.description}</p>
                                    </div>

                                    {/* Learner & Teacher Remarks */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-slate-400">Learner:</span>
                                            <span className="font-black text-slate-900 dark:text-white">{student?.name || 'James Kimani'}</span>
                                        </div>

                                        {item.teacherComments && (
                                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[10px] font-medium text-slate-600 dark:text-slate-300 italic">
                                                "{item.teacherComments}"
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-2 pt-2">
                                            <button
                                                onClick={() => setPreviewMediaModalItem(item)}
                                                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                                                title="View Fullscreen Evidence"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl transition-all cursor-pointer"
                                                title="Delete Evidence"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── UPLOAD PROJECT EVIDENCE MODAL ── */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 md:p-8 space-y-6 shadow-2xl text-left animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-cyan-500" />
                                    <span>Upload Practical Project Evidence</span>
                                </h3>
                                <p className="text-xs text-slate-400">Attach photo/document evidence of learner practical SBA task.</p>
                            </div>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-slate-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNewItem} className="space-y-4 text-xs">
                            <div>
                                <label className="font-black uppercase tracking-wider text-slate-400 block mb-1">Select Learner</label>
                                <select
                                    value={formStudentId}
                                    onChange={e => setFormStudentId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 font-bold rounded-2xl border border-slate-200 dark:border-slate-700 outline-none"
                                >
                                    {classStudents.map(st => (
                                        <option key={st.id} value={st.id}>{st.name} ({resolveRealStudentAdmNo(st, undefined, fetchedStudents)})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-black uppercase tracking-wider text-slate-400 block mb-1">Learning Area</label>
                                    <input
                                        type="text"
                                        value={formSubjectName}
                                        onChange={e => setFormSubjectName(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 font-bold rounded-2xl border border-slate-200 dark:border-slate-700 outline-none"
                                        placeholder="e.g. Agriculture & Nutrition"
                                    />
                                </div>

                                <div>
                                    <label className="font-black uppercase tracking-wider text-slate-400 block mb-1">Sub-Strand</label>
                                    <input
                                        type="text"
                                        value={formSubStrandName}
                                        onChange={e => setFormSubStrandName(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 font-bold rounded-2xl border border-slate-200 dark:border-slate-700 outline-none"
                                        placeholder="e.g. Vertical Sack Gardening"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-black uppercase tracking-wider text-slate-400 block mb-1">Project Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 font-bold rounded-2xl border border-slate-200 dark:border-slate-700 outline-none"
                                    placeholder="e.g. Construction of Kitchen Garden"
                                />
                            </div>

                            <div>
                                <label className="font-black uppercase tracking-wider text-slate-400 block mb-1">Project Photo Evidence</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-cyan-500 file:text-white hover:file:brightness-110 cursor-pointer"
                                    />
                                </div>
                                {formMediaUrl && (
                                    <div className="mt-2 h-24 w-32 rounded-xl overflow-hidden border border-slate-200">
                                        <img src={formMediaUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="font-black uppercase tracking-wider text-slate-400 block mb-1">Rubric Rating Score</label>
                                <div className="flex items-center gap-2">
                                    {(['EE', 'ME', 'AE', 'BE'] as CbeRubricLevel[]).map(lvl => (
                                        <button
                                            type="button"
                                            key={lvl}
                                            onClick={() => setFormRubricScore(lvl)}
                                            className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                                                formRubricScore === lvl
                                                    ? 'bg-cyan-500 text-white shadow-md'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}
                                        >
                                            {lvl} (4)
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="font-black uppercase tracking-wider text-slate-400 block mb-1">Teacher Assessment Comments</label>
                                <textarea
                                    rows={2}
                                    value={formTeacherComments}
                                    onChange={e => setFormTeacherComments(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 font-medium rounded-2xl border border-slate-200 dark:border-slate-700 outline-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-cyan-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20"
                                >
                                    Save Evidence File
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── FULLSCREEN MEDIA PREVIEW MODAL ── */}
            {previewMediaModalItem && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 w-full max-w-3xl p-6 text-white space-y-4 shadow-2xl relative">
                        <button
                            onClick={() => setPreviewMediaModalItem(null)}
                            className="absolute top-6 right-6 p-2 bg-slate-800 text-slate-300 rounded-xl hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-lg font-black uppercase">{previewMediaModalItem.title}</h3>
                        <p className="text-xs text-cyan-400 font-bold">{previewMediaModalItem.subjectName} • {previewMediaModalItem.subStrandName}</p>

                        <div className="max-h-[60vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                            <img src={previewMediaModalItem.mediaUrl} alt={previewMediaModalItem.title} className="max-h-[55vh] object-contain" />
                        </div>

                        <p className="text-xs text-slate-300 italic">"{previewMediaModalItem.teacherComments}"</p>
                    </div>
                </div>
            )}
        </div>
    );
};
