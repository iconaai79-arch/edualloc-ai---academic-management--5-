import React, { useState, useMemo, useRef } from 'react';
import type { User, Institution, EmployeeDocument, EmployeeDocumentCategory } from '../../types';
import { apiService } from '../../services/apiService';
import { formatRoleDisplayName } from '../../utils/roleUtils';
import { 
    XIcon, 
    PlusIcon, 
    SearchIcon, 
    ArrowUpTrayIcon, 
    DocumentTextIcon, 
    DownloadIcon, 
    EyeIcon, 
    TrashIcon, 
    CheckCircleIcon, 
    ExclamationTriangleIcon, 
    ShieldCheckIcon, 
    AcademicCapIcon, 
    BriefcaseIcon, 
    BanknotesIcon, 
    HeartIcon, 
    FileTextIcon, 
    CheckBadgeIcon, 
    StarIcon, 
    AlertTriangleIcon,
    ClockIcon,
    FunnelIcon
} from '../icons';

interface EmployeeDocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffMember: User | null;
    institution: Institution;
    currentUser?: User;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDocumentsUpdated?: (updatedStaff: User) => void;
}

export const CATEGORY_DEFINITIONS: { 
    id: EmployeeDocumentCategory; 
    label: string; 
    description: string;
    icon: React.FC<{ className?: string }>; 
    badgeColor: string;
    isCoreCompliance?: boolean;
}[] = [
    { 
        id: 'contract', 
        label: 'Employment Contract', 
        description: 'Signed letter of appointment, job offer, or service agreement',
        icon: BriefcaseIcon, 
        badgeColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        isCoreCompliance: true
    },
    { 
        id: 'national_id', 
        label: 'National ID / Passport', 
        description: 'Government identity card, passport, or alien registration',
        icon: ShieldCheckIcon, 
        badgeColor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        isCoreCompliance: true
    },
    { 
        id: 'academic_certificate', 
        label: 'Academic & Professional Certs', 
        description: 'Degree, diploma, KCSE, licenses, or practicing certs',
        icon: AcademicCapIcon, 
        badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        isCoreCompliance: true
    },
    { 
        id: 'kra_pin', 
        label: 'KRA PIN / Tax Certificate', 
        description: 'Kenya Revenue Authority PIN certificate or tax compliance',
        icon: DocumentTextIcon, 
        badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        isCoreCompliance: true
    },
    { 
        id: 'social_security', 
        label: 'NSSF / SHIF Registration', 
        description: 'Social security and health insurance fund registration cards',
        icon: HeartIcon, 
        badgeColor: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    },
    { 
        id: 'cv_resume', 
        label: 'Curriculum Vitae (CV)', 
        description: 'Professional resume and career profile',
        icon: FileTextIcon, 
        badgeColor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    },
    { 
        id: 'conduct_certificate', 
        label: 'Police Clearance (Good Conduct)', 
        description: 'Directorate of Criminal Investigations (DCI) clearance',
        icon: CheckBadgeIcon, 
        badgeColor: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        isCoreCompliance: true
    },
    { 
        id: 'medical_report', 
        label: 'Medical Fitness / Health Report', 
        description: 'Occupational health clearance, food handler, or medical exam',
        icon: HeartIcon, 
        badgeColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    },
    { 
        id: 'appraisal', 
        label: 'Performance Appraisal', 
        description: 'Annual or quarterly performance evaluation reports',
        icon: StarIcon, 
        badgeColor: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
    },
    { 
        id: 'disciplinary', 
        label: 'Disciplinary & Commendations', 
        description: 'Warning letters, show-cause notices, or recognition awards',
        icon: AlertTriangleIcon, 
        badgeColor: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    },
    { 
        id: 'bank_details', 
        label: 'Bank Account Confirmation', 
        description: 'Cancelled cheque, bank statement header, or EFT form',
        icon: BanknotesIcon, 
        badgeColor: 'bg-lime-50 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 border-lime-200 dark:border-lime-800'
    },
    { 
        id: 'other', 
        label: 'Other / Miscellaneous', 
        description: 'Any additional personnel documentation',
        icon: DocumentTextIcon, 
        badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    }
];

export const EmployeeDocumentsModal: React.FC<EmployeeDocumentsModalProps> = ({
    isOpen,
    onClose,
    staffMember,
    institution,
    currentUser,
    onEditUser,
    onDocumentsUpdated
}) => {
    // Document list state parsed from staff metadata
    const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Upload form state
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadCategory, setUploadCategory] = useState<EmployeeDocumentCategory>('contract');
    const [uploadExpiryDate, setUploadExpiryDate] = useState('');
    const [uploadNotes, setUploadNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgressMsg, setUploadProgressMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview state
    const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);

    // Sync documents when modal opens or staff member changes
    React.useEffect(() => {
        if (isOpen && staffMember) {
            let meta = staffMember.metadata || {};
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            }
            const existingDocs: EmployeeDocument[] = Array.isArray(meta.documents) 
                ? meta.documents 
                : Array.isArray((staffMember as any).documents)
                ? (staffMember as any).documents
                : [];
            setDocuments(existingDocs);
            setShowUploadForm(existingDocs.length === 0);
            setSelectedCategoryFilter('all');
            setSearchQuery('');
            setPreviewDoc(null);
            resetForm();
        }
    }, [isOpen, staffMember]);

    if (!isOpen || !staffMember) return null;

    const resetForm = () => {
        setUploadTitle('');
        setUploadCategory('contract');
        setUploadExpiryDate('');
        setUploadNotes('');
        setSelectedFile(null);
        setIsUploading(false);
        setUploadProgressMsg('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            if (!uploadTitle.trim()) {
                // Auto-generate clean title from filename
                const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
                const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                setUploadTitle(capitalized);
            }
        }
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes || bytes === 0) return 'Unknown size';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            alert('Please select a file to upload.');
            return;
        }
        if (!uploadTitle.trim()) {
            alert('Please provide a document title.');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgressMsg('Uploading file to secure storage...');

            const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `staff_documents/${staffMember.id}/${Date.now()}_${cleanFileName}`;

            // Upload via project's unified uploadFile service
            const uploadedUrl = await apiService.uploadFile('eduai', storagePath, selectedFile);
            if (!uploadedUrl) {
                throw new Error('Could not upload file to storage.');
            }

            setUploadProgressMsg('Saving document record...');

            const newDoc: EmployeeDocument = {
                id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                institutionId: institution.id,
                userId: staffMember.id,
                name: uploadTitle.trim(),
                category: uploadCategory,
                fileUrl: uploadedUrl,
                fileName: selectedFile.name,
                fileSize: formatBytes(selectedFile.size),
                fileType: selectedFile.type || 'application/octet-stream',
                uploadDate: new Date().toISOString(),
                expiryDate: uploadExpiryDate ? uploadExpiryDate : undefined,
                notes: uploadNotes.trim() ? uploadNotes.trim() : undefined,
                uploadedBy: currentUser?.name || 'HR Officer',
                status: 'active'
            };

            const updatedDocs = [newDoc, ...documents];
            setDocuments(updatedDocs);

            // Persist to user.metadata
            let meta = staffMember.metadata || {};
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            }
            const updatedMeta = {
                ...meta,
                documents: updatedDocs
            };

            if (onEditUser) {
                await onEditUser(staffMember.id, { metadata: updatedMeta });
            }
            await apiService.updateModuleRecord('users', staffMember.id, { metadata: updatedMeta }).catch(() => null);

            // Also dual-save to employee_documents table for SQL indexing & reporting
            await apiService.createModuleRecord('employee_documents', {
                id: newDoc.id,
                institution_id: institution.id,
                institutionId: institution.id,
                user_id: staffMember.id,
                userId: staffMember.id,
                name: newDoc.name,
                category: newDoc.category,
                file_url: newDoc.fileUrl,
                fileUrl: newDoc.fileUrl,
                file_name: newDoc.fileName,
                fileName: newDoc.fileName,
                file_size: newDoc.fileSize,
                fileSize: newDoc.fileSize,
                file_type: newDoc.fileType,
                fileType: newDoc.fileType,
                expiry_date: newDoc.expiryDate || null,
                expiryDate: newDoc.expiryDate || null,
                notes: newDoc.notes || null,
                uploaded_by: newDoc.uploadedBy,
                uploadedBy: newDoc.uploadedBy,
                status: 'active'
            }).catch(() => null);

            if (onDocumentsUpdated) {
                onDocumentsUpdated({
                    ...staffMember,
                    metadata: updatedMeta
                });
            }

            resetForm();
            setShowUploadForm(false);
            alert(`✓ Document "${newDoc.name}" uploaded and filed successfully!`);
        } catch (err: any) {
            console.error('Failed to upload employee document:', err);
            alert(`Failed to upload document: ${err.message || err}`);
        } finally {
            setIsUploading(false);
            setUploadProgressMsg('');
        }
    };

    const handleDeleteDocument = async (doc: EmployeeDocument) => {
        if (!window.confirm(`Are you sure you want to remove the document "${doc.name}"?`)) {
            return;
        }

        try {
            const updatedDocs = documents.filter(d => d.id !== doc.id);
            setDocuments(updatedDocs);

            let meta = staffMember.metadata || {};
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            }
            const updatedMeta = {
                ...meta,
                documents: updatedDocs
            };

            if (onEditUser) {
                await onEditUser(staffMember.id, { metadata: updatedMeta });
            }
            await apiService.updateModuleRecord('users', staffMember.id, { metadata: updatedMeta }).catch(() => null);

            // Remove from employee_documents table
            await apiService.deleteModuleRecord('employee_documents', doc.id).catch(() => null);

            if (onDocumentsUpdated) {
                onDocumentsUpdated({
                    ...staffMember,
                    metadata: updatedMeta
                });
            }

            if (previewDoc?.id === doc.id) {
                setPreviewDoc(null);
            }
        } catch (err: any) {
            console.error('Failed to delete employee document:', err);
            alert(`Failed to delete document: ${err.message || err}`);
        }
    };

    // Calculate expiry status
    const getExpiryStatus = (expiryDate?: string) => {
        if (!expiryDate) return null;
        const now = new Date();
        const exp = new Date(expiryDate);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                label: `Expired (${Math.abs(diffDays)}d ago)`,
                color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900',
                isExpired: true
            };
        }
        if (diffDays <= 30) {
            return {
                label: `Expires in ${diffDays}d`,
                color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
                isExpiringSoon: true
            };
        }
        return {
            label: `Valid (${exp.toLocaleDateString()})`,
            color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
            isValid: true
        };
    };

    // Core compliance checklist
    const complianceChecks = useMemo(() => {
        const coreCategories: EmployeeDocumentCategory[] = ['contract', 'national_id', 'academic_certificate', 'kra_pin', 'conduct_certificate'];
        return coreCategories.map(cat => {
            const def = CATEGORY_DEFINITIONS.find(c => c.id === cat)!;
            const hasDoc = documents.some(d => d.category === cat);
            return {
                ...def,
                fulfilled: hasDoc
            };
        });
    }, [documents]);

    const complianceScore = Math.round((complianceChecks.filter(c => c.fulfilled).length / complianceChecks.length) * 100);

    // Filter documents
    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            const matchesCat = selectedCategoryFilter === 'all' || doc.category === selectedCategoryFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || doc.name.toLowerCase().includes(q) || (doc.fileName || '').toLowerCase().includes(q) || (doc.notes || '').toLowerCase().includes(q);
            return matchesCat && matchesQuery;
        });
    }, [documents, selectedCategoryFilter, searchQuery]);

    const staffIdCode = staffMember.staffId || staffMember.teacherCode || staffMember.code || `ID-${staffMember.id.substring(0, 6).toUpperCase()}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                
                {/* ── MODAL HEADER ── */}
                <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-start shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/20 shrink-0">
                            {staffMember.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {staffMember.name}
                                </h2>
                                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800">
                                    {staffIdCode}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {formatRoleDisplayName(staffMember.role as any, institution)}
                                </span>
                                {staffMember.email && (
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                        {staffMember.email}
                                    </span>
                                )}
                                {staffMember.phoneNumber && (
                                    <span className="text-xs font-mono text-slate-400">
                                        • {staffMember.phoneNumber}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 transition-all cursor-pointer"
                        title="Close Modal"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* ── TOP COMPLIANCE & SUMMARY BAR ── */}
                <div className="px-6 sm:px-8 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                    {/* Compliance Progress */}
                    <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compliance Health</p>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                                {complianceScore}% <span className="text-[10px] font-bold text-slate-400">Complete</span>
                            </h4>
                        </div>
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 flex items-center justify-center relative">
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{documents.length}</span>
                        </div>
                    </div>

                    {/* Core Documents Status */}
                    <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 md:col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Core HR Checklist</p>
                        <div className="flex flex-wrap gap-2">
                            {complianceChecks.map(check => (
                                <span
                                    key={check.id}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-colors ${
                                        check.fulfilled
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-dashed border-slate-300 dark:border-slate-700'
                                    }`}
                                >
                                    {check.fulfilled ? (
                                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                        <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                    {check.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── MODAL BODY (SCROLLABLE) ── */}
                <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
                    
                    {/* Action Bar (Upload Trigger + Search + Filter) */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <select
                                value={selectedCategoryFilter}
                                onChange={e => setSelectedCategoryFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">All Categories ({documents.length})</option>
                                {CATEGORY_DEFINITIONS.map(cat => {
                                    const count = documents.filter(d => d.category === cat.id).length;
                                    return (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.label} {count > 0 ? `(${count})` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <button
                            onClick={() => setShowUploadForm(!showUploadForm)}
                            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {showUploadForm ? <XIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                            <span>{showUploadForm ? 'Cancel Upload' : 'Upload New Document'}</span>
                        </button>
                    </div>

                    {/* ── UPLOAD FORM (ACCORDION / PANEL) ── */}
                    {showUploadForm && (
                        <form onSubmit={handleUploadSubmit} className="p-6 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-inner space-y-5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-3">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Upload Personnel Document</h4>
                                    <p className="text-[11px] text-slate-500 font-medium">Attach verified employment records, certifications, or identity documentation.</p>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-md">
                                    Secure Storage
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                                        Document Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Employment Contract 2025"
                                        value={uploadTitle}
                                        onChange={e => setUploadTitle(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                                        Document Category *
                                    </label>
                                    <select
                                        value={uploadCategory}
                                        onChange={e => setUploadCategory(e.target.value as EmployeeDocumentCategory)}
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {CATEGORY_DEFINITIONS.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Expiry Date (Optional) */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                                        Validity / Expiry Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={uploadExpiryDate}
                                        onChange={e => setUploadExpiryDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 block">Helpful for contracts, medical, and good conduct certs.</span>
                                </div>

                                {/* Notes / Remarks */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                                        Notes & Remarks (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Original verified by HR Officer on Jan 2026"
                                        value={uploadNotes}
                                        onChange={e => setUploadNotes(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* File Drag & Drop / Selector */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                                    Attach Document File *
                                </label>
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center bg-white dark:bg-slate-900 transition-colors">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        className="hidden"
                                        id="employee-doc-file-input"
                                    />
                                    <label htmlFor="employee-doc-file-input" className="cursor-pointer flex flex-col items-center justify-center">
                                        <ArrowUpTrayIcon className="w-8 h-8 text-indigo-500 mb-2 animate-bounce" />
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                            {selectedFile ? selectedFile.name : 'Click to choose document or drop file here'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 mt-1">
                                            {selectedFile ? `${formatBytes(selectedFile.size)} • ${selectedFile.type || 'file'}` : 'Supports PDF, Word Documents (.docx), and high-res Scans (.png, .jpg)'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetForm();
                                        setShowUploadForm(false);
                                    }}
                                    className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-300 transition-all cursor-pointer"
                                    disabled={isUploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading || !selectedFile}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>{uploadProgressMsg || 'Uploading...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUpTrayIcon className="w-4 h-4" />
                                            <span>Upload & Save Document</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── DOCUMENT LIST ── */}
                    {filteredDocuments.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                            <DocumentTextIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <h4 className="text-base font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">No documents filed yet</h4>
                            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto mt-1">
                                {searchQuery 
                                    ? `No documents matched "${searchQuery}". Try clearing search filters.` 
                                    : `Upload contracts, identity scans, tax credentials, and certifications for ${staffMember.name}.`}
                            </p>
                            {!showUploadForm && (
                                <button
                                    onClick={() => setShowUploadForm(true)}
                                    className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Upload First Document</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredDocuments.map(doc => {
                                const categoryDef = CATEGORY_DEFINITIONS.find(c => c.id === doc.category) || CATEGORY_DEFINITIONS[CATEGORY_DEFINITIONS.length - 1];
                                const CategoryIcon = categoryDef.icon;
                                const expiry = getExpiryStatus(doc.expiryDate);

                                return (
                                    <div
                                        key={doc.id}
                                        className="group p-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                                        <CategoryIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors" title={doc.name}>
                                                            {doc.name}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-mono truncate" title={doc.fileName}>
                                                            {doc.fileName || 'document.pdf'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border shrink-0 ${categoryDef.badgeColor}`}>
                                                    {categoryDef.label}
                                                </span>
                                            </div>

                                            {/* Details & Notes */}
                                            <div className="mt-3.5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                                {doc.notes && (
                                                    <p className="italic text-slate-500 dark:text-slate-400 line-clamp-2">
                                                        "{doc.notes}"
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-slate-400 flex-wrap">
                                                    <span>Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</span>
                                                    {doc.fileSize && <span>• {doc.fileSize}</span>}
                                                    {doc.uploadedBy && <span>• By {doc.uploadedBy}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expiry Pill + Actions */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                            <div>
                                                {expiry ? (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${expiry.color}`}>
                                                        <ClockIcon className="w-3 h-3" />
                                                        {expiry.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Permanent
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {/* Preview */}
                                                <button
                                                    onClick={() => setPreviewDoc(doc)}
                                                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition-all"
                                                    title="Preview Document"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>

                                                {/* Download */}
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download={doc.fileName || doc.name}
                                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all inline-flex items-center"
                                                    title="Download Document"
                                                >
                                                    <DownloadIcon className="w-4 h-4" />
                                                </a>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDeleteDocument(doc)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                                                    title="Delete Document"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── MODAL FOOTER ── */}
                <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <p className="text-[11px] font-bold text-slate-400">
                        {documents.length} employee document{documents.length === 1 ? '' : 's'} on record for {staffMember.name}.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer"
                    >
                        Done
                    </button>
                </div>

                {/* ── INLINE PREVIEW OVERLAY ── */}
                {previewDoc && (
                    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in duration-150">
                        <div className="flex justify-between items-center text-white pb-4 border-b border-white/10 shrink-0">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">{previewDoc.name}</h3>
                                <p className="text-xs text-slate-300 font-mono">{previewDoc.fileName} • {previewDoc.fileSize}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={previewDoc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={previewDoc.fileName || previewDoc.name}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2"
                                >
                                    <DownloadIcon className="w-4 h-4" />
                                    <span>Download Original</span>
                                </a>
                                <button
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                            {previewDoc.fileUrl.startsWith('data:image/') || previewDoc.fileName?.match(/\.(png|jpe?g|webp|gif)$/i) ? (
                                <img
                                    src={previewDoc.fileUrl}
                                    alt={previewDoc.name}
                                    className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
                                />
                            ) : (
                                <iframe
                                    src={previewDoc.fileUrl}
                                    title={previewDoc.name}
                                    className="w-full h-full max-w-5xl rounded-xl bg-white shadow-2xl border-none"
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
