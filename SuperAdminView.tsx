import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type {
    Institution, User, Subject, Department, CompanyDetails, MpesaTransaction,
    Receipt, InvoiceItem, ActivityLog, Course, ExtensionRequest, Semester,
    SmsConfig, AllocationRequest, LetterheadConfig, Priority, Unavailability,
    UserUpdateData, MpesaConfig, SubscriptionConfig, EmailConfig, TransactionStatus
} from './types.ts';
import { TransactionsManager } from './TransactionsManager.tsx';
import { DatabaseSettings } from './components/DatabaseSettings.tsx';
import { ActivityLogView } from './components/ActivityLogView.tsx';
import { UserManager } from './components/UserManager.tsx';
import {
    CheckCircleIcon,
    ChatBubbleBottomCenterTextIcon,
    ClipboardListIcon,
    ChartPieIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    RectangleStackIcon,
    Cog8ToothIcon,
    CheckIcon,
    ShieldIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ClockIcon,
    CreditCardIcon,
    InformationCircleIcon,
    XIcon,
    ArrowsRightLeftIcon,
    ArchiveBoxIcon,
    PrinterIcon,
    ArrowUpTrayIcon,
    EyeIcon,
    DocumentArrowDownIcon,
    CommandLineIcon,
    MpesaIcon,
    CurrencyIcon,
    PaperAirplaneIcon,
    LockClosedIcon,
    EnvelopeIcon
} from './components/icons/index.ts';
import { CommunicationsManager } from './components/CommunicationsManager.tsx';
import { EditInstitutionModal } from './EditInstitutionModal.tsx';
import { apiService } from './services/apiService.ts';
import { generateFullSqlScript } from './utils/sqlGenerator.ts';
import { BrandedPaper } from './components/BrandedPaper.tsx';

interface SuperAdminViewProps {
    institutions: Institution[];
    users: User[];
    subjects: Subject[];
    departments: Department[];
    courses: Course[];
    transactions: MpesaTransaction[];
    receipts: Receipt[];
    onAddInstitution: (data: Omit<Institution, 'id'>) => void;
    companyDetails: CompanyDetails;
    onUpdateCompanyDetails: (details: CompanyDetails) => Promise<void>;
    onDeleteInstitution: (institutionId: string) => void;
    onToggleInstitutionStatus: (institutionId: string) => void;
    onUpdateInstitution: (institutionId: string, data: Partial<Institution>) => void;
    onLoginAsAdmin: (institutionId: string) => void;
    onGenerateReceipt: (transaction: MpesaTransaction) => void;
    // FIXED: Updated signature to accept dueDate (4th argument) to resolve type mismatch in App.tsx
    onManualInvoice: (institutionId: string, items: InvoiceItem[], totalAmount: number, dueDate: string) => void;
    activityLog: ActivityLog[];
    onSendSms: (recipient: string, message: string) => Promise<{ success: boolean; message: string }>;
    extensionRequests: ExtensionRequest[];
    onUpdateExtensionRequestStatus: (requestId: string, status: 'approved' | 'rejected', extensionDays?: number) => void;
    onImportUsers: (users: Omit<User, 'id' | 'institutionId'>[]) => Promise<void>;
    onImportStudents: (students: Omit<User, 'id' | 'institutionId'>[]) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    onEditUser: (userId: string, data: UserUpdateData) => Promise<void>;
    logoUrl: string | null;
    currentUser: User;
    semesters: Semester[];
    allocations: AllocationRequest[];
    smsConfig: SmsConfig;
    letterheadConfig: LetterheadConfig;
    footerImageUrl: string | null;
    onDirectAssign: (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections: Record<string, string[]>) => void;
    onUpdateRequest: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    onWithdrawRequest: (requestId: string) => void;
    onAddUnavailability: (userId: string, unavailability: Omit<Unavailability, 'id' | 'status'>) => void;
    onUpdateUnavailability: (userId: string, unavailabilityId: string, data: Partial<Omit<Unavailability, 'id'>>) => void;
    onDeleteUnavailability: (userId: string, unavailabilityId: string) => void;
    onManageUnavailability: (user: User) => void;
    onAddParent: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent: (studentId: string, parentId: string) => void;
}

const StatCard: React.FC<{ title: string; value: number | string; icon?: React.ReactNode; colorClass?: string }> = ({ title, value, icon, colorClass = 'text-slate-400' }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] truncate">{title}</h3>
                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
            </div>
            {icon && <div className={`p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl ${colorClass}`}>{icon}</div>}
        </div>
    </div>
);

export const SuperAdminView: React.FC<SuperAdminViewProps> = (props) => {
    // Fixed: Defensive empty arrays to handle potentially undefined prop data
    const {
        institutions = [],
        users = [],
        subjects = [],
        departments = [],
        courses = [],
        companyDetails,
        onDeleteInstitution,
        onToggleInstitutionStatus,
        onUpdateInstitution,
        onUpdateCompanyDetails,
        onLoginAsAdmin,
        onSendSms,
        currentUser,
        onImportUsers,
        onImportStudents,
        onEditUser,
        onDeleteUser,
        activityLog = [],
        semesters = [],
        logoUrl,
        transactions = [],
        receipts = [],
        onGenerateReceipt
    } = props;

    const [activeTab, setActiveTab] = useState<'dashboard' | 'institutions' | 'all_users' | 'communications' | 'settings' | 'migration' | 'user_activity'>('dashboard');
    const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'infrastructure' | 'branding' | 'sms' | 'email' | 'billing'>('profile');
    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
    const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
    const [migrationSubTab, setMigrationSubTab] = useState<'full' | 'semester'>('full');
    const [showDocumentPreview, setShowDocumentPreview] = useState(false);
    const [copyStatus, setCopyStatus] = useState(false);
    const [institutionSubTab, setInstitutionSubTab] = useState<'list' | 'extensions'>('list');

    // Configuration local states
    const [localCompanyInfo, setLocalCompanyInfo] = useState({
        name: companyDetails?.name || '',
        applicationTitle: companyDetails?.applicationTitle || '',
        themeColor: companyDetails?.themeColor || '#4f46e5',
        email: companyDetails?.email || '',
        phone: companyDetails?.phone || '',
        website: companyDetails?.website || '',
        address: companyDetails?.address || '',
        logoUrl: companyDetails?.logoUrl || '',
        footerImageUrl: companyDetails?.footerImageUrl || '',
        letterheadConfig: companyDetails?.letterheadConfig || { headerImageUrl: null, stampImageUrl: null },
        welcomeMessage: companyDetails?.chatAssistantConfig?.welcomeMessage || '',
        chatEnabled: companyDetails?.chatAssistantConfig?.enabled ?? true
    });

    const [localSmsConfig, setLocalSmsConfig] = useState<SmsConfig>(companyDetails?.smsConfig || { provider: 'ABMIS', apiKey: '', apiSecret: '', fromNumber: '' });
    const [localEmailConfig, setLocalEmailConfig] = useState<EmailConfig>(companyDetails?.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
    const [localMpesaConfig, setLocalMpesaConfig] = useState<MpesaConfig>(companyDetails?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
    const [localSubConfig, setLocalSubConfig] = useState<SubscriptionConfig>(companyDetails?.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });

    const [isSavingConfigs, setIsSavingConfigs] = useState(false);

    const fetchHealth = useCallback(async () => {
        setIsRefreshingHealth(true);
        try {
            const health = await apiService.testDatabaseConnection();
            setHealthStatus(health);
        } catch (e) {
            setHealthStatus({ status: 'offline', dbName: 'Unknown' });
        } finally {
            setIsRefreshingHealth(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'dashboard') fetchHealth();
    }, [activeTab, fetchHealth]);

    const filteredInstitutions = useMemo(() => {
        const list = Array.isArray(institutions) ? institutions : [];
        if (!institutionSearchQuery.trim()) return list;
        const lower = institutionSearchQuery.toLowerCase();
        return list.filter(inst =>
            inst && (inst.name?.toLowerCase().includes(lower) ||
                inst.institutionCode?.toLowerCase().includes(lower))
        );
    }, [institutions, institutionSearchQuery]);

    useEffect(() => {
        if (companyDetails) {
            setLocalCompanyInfo({
                name: companyDetails.name || '',
                applicationTitle: companyDetails.applicationTitle || '',
                themeColor: companyDetails.themeColor || '#4f46e5',
                email: companyDetails.email || '',
                phone: companyDetails.phone || '',
                website: companyDetails.website || '',
                address: companyDetails.address || '',
                logoUrl: companyDetails.logoUrl || '',
                footerImageUrl: companyDetails.footerImageUrl || '',
                letterheadConfig: companyDetails.letterheadConfig || { headerImageUrl: null, stampImageUrl: null },
                welcomeMessage: companyDetails.chatAssistantConfig?.welcomeMessage || '',
                chatEnabled: companyDetails.chatAssistantConfig?.enabled ?? true
            });
            setLocalSmsConfig(companyDetails.smsConfig || { provider: 'ABMIS', apiKey: '', apiSecret: '', fromNumber: '' });
            setLocalEmailConfig(companyDetails.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
            setLocalMpesaConfig(companyDetails.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
            setLocalSubConfig(companyDetails.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });
        }
    }, [companyDetails]);

    const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead' | 'footer') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (type === 'logo') setLocalCompanyInfo(prev => ({ ...prev, logoUrl: dataUrl }));
            if (type === 'letterhead') {
                setLocalCompanyInfo(prev => ({
                    ...prev,
                    letterheadConfig: { ...prev.letterheadConfig, headerImageUrl: dataUrl }
                }));
            }
            if (type === 'footer') setLocalCompanyInfo(prev => ({ ...prev, footerImageUrl: dataUrl }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveGlobalConfigs = async () => {
        setIsSavingConfigs(true);
        try {
            await onUpdateCompanyDetails({
                ...companyDetails,
                ...localCompanyInfo,
                smsConfig: localSmsConfig,
                emailConfig: localEmailConfig,
                mpesaConfig: localMpesaConfig,
                subscriptionConfig: localSubConfig,
                chatAssistantConfig: {
                    ...companyDetails.chatAssistantConfig,
                    welcomeMessage: localCompanyInfo.welcomeMessage,
                    enabled: localCompanyInfo.chatEnabled
                }
            });
            alert("Platform configurations updated successfully.");
        } catch (e) {
            alert("Failed to save configurations.");
        } finally {
            setIsSavingConfigs(false);
        }
    };

    const fullSqlScript = useMemo(() => generateFullSqlScript(), []);

    const semesterSqlPreview = useMemo(() => {
        let sql = `-- Table Schema: semesters\n`;
        sql += `CREATE TABLE IF NOT EXISTS semesters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'inactive',
    request_deadline DATE,
    enrollment_deadline DATE,
    sessions JSONB DEFAULT '[]'::jsonb
);\n\n`;

        if (!semesters || semesters.length === 0) {
            sql += `-- No semester data found.\n`;
            return sql;
        }

        const escapeSql = (str: any) => {
            if (str === null || str === undefined || str === '') return 'NULL';
            return `'${String(str).replace(/'/g, "''")}'`;
        };

        semesters.forEach(s => {
            sql += `INSERT INTO semesters (id, name, academic_year_id, institution_id, start_date, end_date, status, request_deadline, enrollment_deadline, sessions) 
VALUES (${escapeSql(s.id)}, ${escapeSql(s.name)}, ${escapeSql(s.academicYearId)}, ${escapeSql(s.institutionId)}, ${escapeSql(s.startDate)}, ${escapeSql(s.endDate)}, ${escapeSql(s.status)}, ${escapeSql(s.requestDeadline)}, ${escapeSql(s.enrollmentDeadline)}, ${escapeSql(JSON.stringify(s.sessions || []))}::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, sessions = EXCLUDED.sessions;\n`;
        });
        return sql;
    }, [semesters]);

    const getFullSqlScriptValue = () => migrationSubTab === 'full' ? fullSqlScript : semesterSqlPreview;

    const handleCopySql = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const handleDownloadSql = () => {
        const text = getFullSqlScriptValue();
        const fileName = migrationSubTab === 'full' ? 'eduai_schema_latest.sql' : 'eduai_semesters_latest.sql';
        const blob = new Blob([text], { type: 'text/sql' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const tabs = [
        { key: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
        { key: 'institutions', label: 'Institutions', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> },
        { key: 'all_users', label: 'Global Users', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
        { key: 'communications', label: 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
        { key: 'migration', label: 'System Build', icon: <CommandLineIcon className="w-5 h-5 mr-2" /> },
        { key: 'user_activity', label: 'Audit Trail', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
        { key: 'settings', label: 'Global Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
    ];

    const stats = useMemo(() => {
        const pendingCount = (props.requests || []).filter(r => r && (r.status === 'pending' || r.status === 'hod_approved')).length;
        const changesCount = (props.requests || []).filter(r => r && r.status === 'change_request_pending').length;
        const deallocCount = (props.requests || []).filter(r => r && r.status === 'deallocation_pending').length;
        return { pendingCount, changesCount, deallocCount };
    }, [props.requests]);

    return (
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`${activeTab === tab.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'} inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-all`}>
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Live Tenants" value={institutions.length} icon={<BuildingOfficeIcon className="w-6 h-6" />} colorClass="text-indigo-500" />
                        <StatCard title="Global Users" value={users.length} icon={<UserGroupIcon className="w-6 h-6" />} colorClass="text-emerald-500" />
                        <StatCard title="Total Units" value={subjects.length} icon={<RectangleStackIcon className="w-6 h-6" />} colorClass="text-amber-500" />
                        <StatCard title="Departments" value={departments.length} icon={<BuildingOfficeIcon className="w-6 h-6" />} colorClass="text-rose-500" />
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-2">
                                    <ShieldIcon className="w-6 h-6 text-indigo-500" />
                                    Infrastructure Health Monitor
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Real-time status of the primary database cluster.</p>
                            </div>
                            <button
                                onClick={fetchHealth}
                                disabled={isRefreshingHealth}
                                className="p-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 rounded-xl transition-all shadow-sm"
                            >
                                <ArrowPathIcon className={`w-5 h-5 text-slate-500 ${isRefreshingHealth ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1.5 w-4 h-4 rounded-full flex-shrink-0 ${healthStatus?.status === 'online' ? 'bg-green-50 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-red-50 shadow-[0_0_12px_rgba(239,68,68,0.4)]'}`}></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{healthStatus?.status || 'Validating...'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-indigo-50 dark:bg-slate-700 rounded text-indigo-500">
                                    <RectangleStackIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Cluster</p>
                                    <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[160px]">
                                        {healthStatus?.dbName || 'Detecting...'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-amber-50 dark:bg-slate-700 rounded text-amber-500">
                                    <CommandLineIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Engine</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">PostgreSQL (Supabase)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                                    <ClockIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Sample</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleTimeString() : '--:--:--'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'institutions' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Institutional Tenants</h3>
                            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                <button
                                    onClick={() => setInstitutionSubTab('list')}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${institutionSubTab === 'list'
                                            ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Tenants
                                </button>
                                <button
                                    onClick={() => setInstitutionSubTab('extensions')}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${institutionSubTab === 'extensions'
                                            ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Extension Requests
                                </button>
                            </div>
                        </div>
                        {institutionSubTab === 'list' && (
                            <div className="relative">
                                <input type="text" placeholder="Search by name or code..." value={institutionSearchQuery} onChange={e => setInstitutionSearchQuery(e.target.value)} className="w-72 pl-10 pr-4 py-2.5 border rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                            </div>
                        )}
                    </div>

                    {institutionSubTab === 'list' ? (
                        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tenant Name</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Lifecycle</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredInstitutions.map(inst => (
                                        <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg">
                                                        {inst.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900 dark:text-white">{inst.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">{inst.institutionCode}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-medium">{inst.institutionType}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-lg ${inst.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        inst.status === 'trial' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {inst.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onLoginAsAdmin(inst.id)} className="text-indigo-600 hover:text-indigo-900 font-black text-xs uppercase tracking-tighter">Enter Portal</button>
                                                    <button onClick={() => setEditingInstitution(inst)} className="text-slate-600 hover:text-slate-900 font-bold text-xs uppercase tracking-tighter">Edit</button>
                                                    <button onClick={() => onToggleInstitutionStatus(inst.id)} className="text-yellow-600 hover:text-yellow-900 font-bold text-xs uppercase tracking-tighter">{inst.status === 'suspended' ? 'Resume' : 'Suspend'}</button>
                                                    <button onClick={() => onDeleteInstitution(inst.id)} className="text-red-600 hover:text-red-900 font-black text-xs uppercase tracking-tighter">Purge</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                            {(!props.extensionRequests || props.extensionRequests.length === 0) ? (
                                <div className="p-12 text-center text-slate-500">
                                    <ClockIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                    <h4 className="text-lg font-bold">No Pending Requests</h4>
                                    <p className="text-sm mt-1">There are no trial extension requests at the moment.</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Institution</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Reason</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Requested At</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {props.extensionRequests.map(req => {
                                            const inst = institutions.find(i => i.id === req.institutionId);
                                            return (
                                                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            {inst && (
                                                                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
                                                                    {inst.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-black text-slate-900 dark:text-white">{inst?.name || 'Unknown Institution'}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono">{inst?.institutionCode}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2" title={req.reason}>{req.reason}</p>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                                                        {new Date(req.requestedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-lg ${req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        {req.status === 'pending' && (
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => props.onUpdateExtensionRequestStatus(req.id, 'approved', 7)}
                                                                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                                    title="Approve (7 Days)"
                                                                >
                                                                    <CheckCircleIcon className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => props.onUpdateExtensionRequestStatus(req.id, 'rejected')}
                                                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                                    title="Reject"
                                                                >
                                                                    <XIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'all_users' && (
                <div className="animate-fade-in-up">
                    <UserManager
                        {...props}
                        users={users || []}
                        departments={departments || []}
                        courses={courses || []}
                        subjects={subjects || []}
                        currentUser={currentUser}
                        onAddUser={() => { }}
                        onImportUsers={onImportUsers}
                        onImportStudents={onImportStudents}
                        onDeleteUser={props.onDeleteUser}
                        onEditUser={props.onEditUser}
                        onWithdrawRequest={() => { }}
                        letterheadConfig={localCompanyInfo.letterheadConfig}
                        logoUrl={localCompanyInfo.logoUrl}
                        footerImageUrl={localCompanyInfo.footerImageUrl}
                        onAddParent={props.onAddParent}
                        onDeleteParent={props.onDeleteParent}
                    />
                </div>
            )}

            {activeTab === 'communications' && (
                <div className="animate-fade-in-up">
                    <CommunicationsManager
                        users={users || []}
                        departments={departments || []}
                        courses={courses || []}
                        institutions={institutions || []}
                        onSendSms={onSendSms}
                        currentUser={currentUser}
                    />
                </div>
            )}

            {activeTab === 'migration' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div>
                            <h3 className="text-xl font-black">Database Setup & Schema</h3>
                            <p className="text-sm text-slate-500 mt-1">Export SQL DDL scripts or execute migration directly on the cloud.</p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl">
                            <button onClick={() => setMigrationSubTab('full')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${migrationSubTab === 'full' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-50'}`}>Full Platform</button>
                            <button onClick={() => setMigrationSubTab('semester')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${migrationSubTab === 'semester' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-50'}`}>Modules Only</button>
                        </div>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl relative border-4 border-slate-800">
                        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                            <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">PostgreSQL Deployment Script</h4>
                            <div className="flex gap-3">
                                <button onClick={() => handleCopySql(getFullSqlScriptValue())} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                    {copyStatus ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CommandLineIcon className="w-4 h-4" />}
                                    {copyStatus ? 'Copied' : 'Copy SQL'}
                                </button>
                                <button onClick={handleDownloadSql} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">
                                    <DocumentArrowDownIcon className="w-4 h-4" /> Download .sql
                                </button>
                            </div>
                        </div>
                        <div className="relative group">
                            <pre className="bg-slate-950 text-indigo-300 p-8 rounded-2xl overflow-auto h-[500px] text-xs font-mono leading-relaxed border border-slate-800/50">
                                {getFullSqlScriptValue()}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'user_activity' && (
                <div className="animate-fade-in-up">
                    <ActivityLogView activityLog={activityLog || []} />
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                        <nav className="-mb-px flex space-x-6" aria-label="Settings Sub-tabs">
                            <button
                                onClick={() => setSettingsSubTab('profile')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <InformationCircleIcon className="w-4 h-4" /> Platform Profile
                            </button>
                            <button
                                onClick={() => setSettingsSubTab('infrastructure')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'infrastructure' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <ShieldIcon className="w-4 h-4" /> Registry Infrastructure
                            </button>
                            <button
                                onClick={() => setSettingsSubTab('branding')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'branding' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <SparklesIcon className="w-4 h-4" /> Visual Identity
                            </button>
                            <button
                                onClick={() => setSettingsSubTab('sms')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'sms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <PaperAirplaneIcon className="w-4 h-4" /> SMS Gateway
                            </button>
                            <button
                                onClick={() => setSettingsSubTab('email')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'email' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <EnvelopeIcon className="w-4 h-4" /> Email Relay
                            </button>
                            <button
                                onClick={() => setSettingsSubTab('billing')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <CreditCardIcon className="w-4 h-4" /> Billing Map
                            </button>
                        </nav>
                    </div>

                    <div className="mt-6">
                        {settingsSubTab === 'profile' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                <h3 className="text-lg font-black uppercase mb-6 tracking-tighter">Identity Records</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Platform Legal Name</label>
                                            <input type="text" value={localCompanyInfo.name} onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, name: e.target.value })} className="form-input" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Global Support Email</label>
                                            <input type="email" value={localCompanyInfo.email} onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, email: e.target.value })} className="form-input" />
                                        </div>
                                        <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary w-full h-12 shadow-indigo-100">{isSavingConfigs ? 'Synchronizing...' : 'Update System Profile'}</button>
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                        {localCompanyInfo.logoUrl ? <img src={localCompanyInfo.logoUrl} className="h-20 object-contain mb-4" alt="Logo" /> : <BuildingOfficeIcon className="w-10 h-10 text-slate-200 mb-2" />}
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">System Logo</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {settingsSubTab === 'infrastructure' && (
                            <div className="animate-fade-in">
                                <DatabaseSettings
                                    dbConfig={companyDetails.databaseConfig}
                                    onSave={async (newDbConfig) => {
                                        await onUpdateCompanyDetails({ ...companyDetails, databaseConfig: newDbConfig });
                                    }}
                                />
                            </div>
                        )}

                        {settingsSubTab === 'branding' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="text-xl font-black uppercase tracking-tighter">Branding Interface</h4>
                                        <button onClick={() => setShowDocumentPreview(!showDocumentPreview)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-2">
                                            <EyeIcon className="w-4 h-4" /> {showDocumentPreview ? 'Hide Preview' : 'Show Document Map'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Accent Theme Color</label>
                                                <div className="flex gap-4 items-center">
                                                    <input
                                                        type="color"
                                                        value={props.themeColor}
                                                        onChange={(e) => props.onUpdateThemeColor && props.onUpdateThemeColor(e.target.value)}
                                                        className="h-12 w-24 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer"
                                                    />
                                                    <span className="font-mono text-sm font-bold text-slate-500 uppercase">{props.themeColor}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Application Title</label>
                                                <input type="text" value={localCompanyInfo.applicationTitle} onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, applicationTitle: e.target.value })} className="form-input h-12 text-lg font-black uppercase" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Document Headers & Footers</label>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed text-center">
                                                <label className="cursor-pointer">
                                                    <ArrowUpTrayIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                                    <span className="text-[10px] font-black uppercase text-indigo-600 block">Replace Letterhead Banner</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleLocalImageUpload(e, 'letterhead')} />
                                                </label>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed text-center">
                                                <label className="cursor-pointer">
                                                    <ArrowUpTrayIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                                    <span className="text-[10px] font-black uppercase text-indigo-600 block">Replace Report Footer</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleLocalImageUpload(e, 'footer')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {showDocumentPreview && (
                                        <div className="mt-10 border-4 border-dashed border-slate-200 rounded-[3rem] p-4 scale-90 origin-top bg-slate-100">
                                            <BrandedPaper
                                                institution={null}
                                                letterheadConfig={localCompanyInfo.letterheadConfig}
                                                footerImageUrl={localCompanyInfo.footerImageUrl}
                                            >
                                                <div className="h-64 flex items-center justify-center opacity-5 font-black text-4xl uppercase tracking-[0.4em]">Official Preview</div>
                                            </BrandedPaper>
                                        </div>
                                    )}

                                    <div className="mt-8 flex justify-end">
                                        <button onClick={handleSaveGlobalConfigs} className="btn-primary h-14 px-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save Branding Map</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {settingsSubTab === 'sms' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
                                <h3 className="text-xl font-black uppercase tracking-tight">SMS Gateway Configuration</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">User ID</label><input type="text" value={localSmsConfig.apiKey} onChange={e => setLocalSmsConfig({ ...localSmsConfig, apiKey: e.target.value })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">API Password</label><input type="password" value={localSmsConfig.apiSecret} onChange={e => setLocalSmsConfig({ ...localSmsConfig, apiSecret: e.target.value })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender ID</label><input type="text" value={localSmsConfig.fromNumber} onChange={e => setLocalSmsConfig({ ...localSmsConfig, fromNumber: e.target.value })} className="form-input" /></div>
                                </div>
                                <div className="pt-6 border-t flex justify-end">
                                    <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Sync Gateway</button>
                                </div>
                            </div>
                        )}

                        {settingsSubTab === 'email' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
                                <h3 className="text-xl font-black uppercase tracking-tight">Global Email Relay (SMTP)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">SMTP Host</label><input type="text" value={localEmailConfig.host} onChange={e => setLocalEmailConfig({ ...localEmailConfig, host: e.target.value })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Port</label><input type="number" value={localEmailConfig.port} onChange={e => setLocalEmailConfig({ ...localEmailConfig, port: Number(e.target.value) })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Encryption</label><select value={localEmailConfig.encryption} onChange={e => setLocalEmailConfig({ ...localEmailConfig, encryption: e.target.value as any })} className="form-select"><option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option></select></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Username</label><input type="text" value={localEmailConfig.username} onChange={e => setLocalEmailConfig({ ...localEmailConfig, username: e.target.value })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Password</label><input type="password" value={localEmailConfig.password} onChange={e => setLocalEmailConfig({ ...localEmailConfig, password: e.target.value })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender Name</label><input type="text" value={localEmailConfig.fromName} onChange={e => setLocalEmailConfig({ ...localEmailConfig, fromName: e.target.value })} className="form-input" /></div>
                                    <div className="md:col-span-2"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender Email</label><input type="email" value={localEmailConfig.fromEmail} onChange={e => setLocalEmailConfig({ ...localEmailConfig, fromEmail: e.target.value })} className="form-input" /></div>
                                </div>
                                <div className="pt-6 border-t flex justify-end">
                                    <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Authorize SMTP</button>
                                </div>
                            </div>
                        )}

                        {settingsSubTab === 'billing' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                        <MpesaIcon className="w-6 h-6 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Platform Billing Configuration</h3>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-bold uppercase text-slate-500 border-b pb-1">M-Pesa Daraja Gateway</h4>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Short Code (Paybill)</label><input type="text" value={localMpesaConfig.paybillNumber} onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, paybillNumber: e.target.value })} className="form-input font-mono" placeholder="7-digit code" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Lipa Na M-Pesa Passkey</label><input type="password" value={localMpesaConfig.passkey} onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, passkey: e.target.value })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Consumer Key</label><input type="text" value={localMpesaConfig.consumerKey} onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, consumerKey: e.target.value })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Consumer Secret</label><input type="password" value={localMpesaConfig.consumerSecret} onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, consumerSecret: e.target.value })} className="form-input" /></div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-sm font-bold uppercase text-slate-500 border-b pb-1">Standard Subscription Pricing</h4>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Monthly License (KES)</label><input type="number" value={localSubConfig.defaultMonthlyPrice} onChange={e => setLocalSubConfig({ ...localSubConfig, defaultMonthlyPrice: Number(e.target.value) })} className="form-input font-bold text-lg" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Yearly License (KES)</label><input type="number" value={localSubConfig.defaultYearlyPrice} onChange={e => setLocalSubConfig({ ...localSubConfig, defaultYearlyPrice: Number(e.target.value) })} className="form-input font-bold text-lg" /></div>

                                        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
                                                <span className="text-[10px] font-black uppercase text-slate-600">Gateway Policy</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">Incoming payments are validated against the Paybill and Account Reference (Institution Code). Subscriptions are automatically extended upon successful callback.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t flex justify-end">
                                    <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save Billing Map</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingInstitution && (
                <EditInstitutionModal
                    institution={editingInstitution}
                    onClose={() => setEditingInstitution(null)}
                    onSave={async (id, data) => { onUpdateInstitution!(id, data); setEditingInstitution(null); }}
                    defaultPrices={companyDetails.subscriptionConfig}
                />
            )}
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.5rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 0.75rem; cursor: pointer; transition: all 0.2s; border: none; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2); }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
            `}</style>
        </div>
    );
};