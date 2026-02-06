
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Department, Course, Institution } from '../types';
import { 
    XIcon, 
    SparklesIcon, 
    PaperAirplaneIcon, 
    ChatBubbleBottomCenterTextIcon, 
    ArrowUpTrayIcon, 
    CheckCircleIcon, 
    CheckIcon,
    UserIcon,
    MagnifyingGlassIcon
} from './icons';

interface CommunicationsManagerProps {
    users: User[];
    departments: Department[];
    courses: Course[];
    institutions?: Institution[]; // Optional for super admin view
    onSendSms: (recipient: string, message: string) => Promise<{ success: boolean; message: string }>;
    currentUser?: User;
}

const calculateSmsParts = (msg: string) => {
    const isUnicode = /[^\u0000-\u007F\u0080-\u00FF€]/.test(msg);
    const charCount = msg.length;
    if (charCount === 0) {
        return { count: 0, characters: 0, limit: isUnicode ? 70 : 160, isUnicode };
    }
    if (isUnicode) {
        if (charCount <= 70) return { count: 1, characters: charCount, limit: 70, isUnicode };
        return { count: Math.ceil(charCount / 67), characters: charCount, limit: 67, isUnicode };
    } else {
        if (charCount <= 160) return { count: 1, characters: charCount, limit: 160, isUnicode };
        return { count: Math.ceil(charCount / 153), characters: charCount, limit: 153, isUnicode };
    }
};

export const CommunicationsManager: React.FC<CommunicationsManagerProps> = ({ users, departments, courses, institutions, onSendSms, currentUser }) => {
    const [recipientTarget, setRecipientTarget] = useState('individual');
    const [selectedId, setSelectedId] = useState('');
    const [selectedInstitutionRoleFilter, setSelectedInstitutionRoleFilter] = useState<'all' | 'admins'>('all');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'sending' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [smsInfo, setSmsInfo] = useState({ count: 0, characters: 0, limit: 160, isUnicode: false });
    
    const isSuperAdminView = !!institutions;
    const institutionMap = useMemo(() => institutions ? new Map(institutions.map(i => [i.id, i.name])) : null, [institutions]);

    useEffect(() => {
        setSmsInfo(calculateSmsParts(message));
    }, [message]);

    const filteredUsersForIndividualSelection = useMemo(() => {
        let availableUsers = users;
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos' || currentUser.role === 'tto') && currentUser.departmentId) {
            availableUsers = users.filter(u => u.departmentId === currentUser.departmentId || (u.role === 'student' && courses.some(c => c.id === u.courseId && c.departmentId === currentUser.departmentId)));
        }
        
        if (!searchTerm) return availableUsers.slice(0, 10);
        
        return availableUsers.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.staffId?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 50);
    }, [users, searchTerm, currentUser, courses]);

    const departmentOptions = useMemo(() => {
        if (isSuperAdminView && institutionMap) {
            return departments.map(d => ({
                id: d.id,
                name: `${institutionMap.get(d.institutionId) || 'Unknown Inst.'} - ${d.name}`
            }));
        }
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos' || currentUser.role === 'tto') && currentUser.departmentId) {
            return departments.filter(d => d.id === currentUser.departmentId).map(d => ({ id: d.id, name: d.name }));
        }
        return departments.map(d => ({ id: d.id, name: d.name }));
    }, [departments, isSuperAdminView, institutionMap, currentUser]);
    
    const courseOptions = useMemo(() => {
        if (isSuperAdminView && institutionMap) {
            const dMap = new Map(departments.map(d => [d.id, d.institutionId]));
            return courses.map(c => ({
                id: c.id,
                name: `${institutionMap.get(dMap.get(c.departmentId) || '') || '...'} - ${c.name}`
            }));
        }
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos' || currentUser.role === 'tto') && currentUser.departmentId) {
            return courses.filter(c => c.departmentId === currentUser.departmentId).map(c => ({ id: c.id, name: c.name }));
        }
        return courses.map(c => ({ id: c.id, name: c.name }));
    }, [courses, departments, isSuperAdminView, institutionMap, currentUser]);

    const recipientList = useMemo(() => {
        let baseUsers = users;
        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'dos' || currentUser.role === 'tto') && currentUser.departmentId) {
             const allowedCourseIds = new Set(courses.filter(c => c.departmentId === currentUser.departmentId).map(c => c.id));
             baseUsers = users.filter(u => u.departmentId === currentUser.departmentId || (u.role === 'student' && u.courseId && allowedCourseIds.has(u.courseId)));
        }

        switch (recipientTarget) {
            case 'individual': {
                const user = baseUsers.find(u => u.id === selectedId);
                return user ? [user] : [];
            }
            case 'all_staff': return baseUsers.filter(u => u.role !== 'student');
            case 'all_students': return baseUsers.filter(u => u.role === 'student');
            case 'department': {
                if (!selectedId) return [];
                const staffInDept = baseUsers.filter(u => u.departmentId === selectedId && u.role !== 'student');
                const coursesInDept = new Set(courses.filter(c => c.departmentId === selectedId).map(c => c.id));
                const studentsInDept = baseUsers.filter(u => u.role === 'student' && u.courseId && coursesInDept.has(u.courseId));
                const allInDept = new Map();
                staffInDept.forEach(u => allInDept.set(u.id, u));
                studentsInDept.forEach(u => allInDept.set(u.id, u));
                return Array.from(allInDept.values());
            }
            case 'course': return selectedId ? baseUsers.filter(u => u.courseId === selectedId) : [];
            case 'institution': {
                if (!selectedId) return [];
                const usersInInst = baseUsers.filter(u => u.institutionId === selectedId);
                return selectedInstitutionRoleFilter === 'admins' ? usersInInst.filter(u => u.role === 'admin') : usersInInst;
            }
            default: return [];
        }
    }, [recipientTarget, selectedId, selectedInstitutionRoleFilter, users, courses, currentUser]);

    const validRecipients = useMemo(() => recipientList.filter(u => u.phoneNumber?.trim()), [recipientList]);

    const handleSend = async () => {
        if (validRecipients.length === 0) {
            setStatus({ type: 'error', message: 'No recipients with valid phone numbers found.' });
            return;
        }
        if (!message.trim()) {
            setStatus({ type: 'error', message: 'Message cannot be empty.' });
            return;
        }
        if (!window.confirm(`Broadcast this SMS to ${validRecipients.length} people?`)) return;

        setStatus({ type: 'sending', message: 'Initializing broadcast...' });
        let successCount = 0;
        for (let i = 0; i < validRecipients.length; i++) {
            const user = validRecipients[i];
            try {
                const result = await onSendSms(user.phoneNumber, message);
                if (result.success) successCount++;
            } catch (e) {}
            setStatus({ type: 'sending', message: `Sending: ${i + 1} / ${validRecipients.length}` });
        }
        setStatus({ type: 'success', message: `Successfully broadcast to ${successCount} recipients.` });
        setMessage('');
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 5000);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                    <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold">SMS Broadcasting</h3>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
                <div className="flex-1 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Recipient Group</label>
                            <select value={recipientTarget} onChange={e => { setRecipientTarget(e.target.value); setSelectedId(''); setSearchTerm(''); }} className="form-select w-full">
                                <option value="individual">Individual Member</option>
                                {isSuperAdminView && <option value="institution">Full Institution</option>}
                                <option value="all_staff">All Staff Members</option>
                                <option value="all_students">All Active Students</option>
                                <option value="department">By Department</option>
                                <option value="course">By Course/Grade</option>
                            </select>
                        </div>
                        {recipientTarget === 'individual' && (
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Search Member</label>
                                <div className="relative">
                                    <input type="text" placeholder="Type name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="form-input w-full pl-9" />
                                    <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="animate-fade-in-up">
                        {recipientTarget === 'individual' && (
                            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="form-select w-full">
                                <option value="">-- Select Member ({filteredUsersForIndividualSelection.length} suggestions) --</option>
                                {filteredUsersForIndividualSelection.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role}) - {u.phoneNumber || 'No Phone'}</option>)}
                            </select>
                        )}
                        {recipientTarget === 'department' && (
                            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="form-select w-full">
                                <option value="">-- Choose Department --</option>
                                {departmentOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        )}
                        {recipientTarget === 'course' && (
                            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="form-select w-full">
                                <option value="">-- Choose Course --</option>
                                {courseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                        {recipientTarget === 'institution' && institutions && (
                            <div className="grid grid-cols-2 gap-2">
                                <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="form-select">
                                    <option value="">-- Choose Institution --</option>
                                    {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                                <select value={selectedInstitutionRoleFilter} onChange={e => setSelectedInstitutionRoleFilter(e.target.value as any)} className="form-select">
                                    <option value="all">All Members</option>
                                    <option value="admins">Admins Only</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Valid Phone Contacts: <span className="text-indigo-600 dark:text-indigo-400">{validRecipients.length}</span>
                        </p>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1.5 ml-1">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Broadcast Message</label>
                            <span className={`text-[10px] font-bold ${smsInfo.characters > smsInfo.limit ? 'text-amber-500' : 'text-slate-400'}`}>
                                {smsInfo.characters} chars • {smsInfo.count} SMS
                            </span>
                        </div>
                        <textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} className="form-input w-full resize-none" placeholder="Type your announcement here..."></textarea>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                        <div className="text-xs font-medium italic text-slate-400">
                            {smsInfo.isUnicode ? '✨ Unicode (special chars) detected' : 'Standard GSM encoding'}
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            {status.type !== 'idle' && (
                                <p className={`text-xs font-bold ${status.type === 'error' ? 'text-red-500' : status.type === 'success' ? 'text-green-600' : 'text-slate-500'}`}>
                                    {status.message}
                                </p>
                            )}
                            <button onClick={handleSend} disabled={status.type === 'sending' || validRecipients.length === 0} className="btn-primary flex items-center gap-2 px-8 py-3 shadow-indigo-200">
                                <PaperAirplaneIcon className={`w-4 h-4 ${status.type === 'sending' ? 'animate-pulse' : ''}`} />
                                {status.type === 'sending' ? 'Sending...' : 'Broadcast'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block w-72 flex-shrink-0">
                    <div className="sticky top-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 text-center">Mobile Preview</p>
                        <div className="relative mx-auto border-slate-800 dark:border-slate-700 bg-slate-800 border-[12px] rounded-[3rem] h-[500px] w-full shadow-2xl">
                            <div className="h-[24px] w-[100px] bg-slate-800 top-0 rounded-b-[1.25rem] left-1/2 -translate-x-1/2 absolute z-10"></div>
                            <div className="rounded-[2.25rem] overflow-hidden w-full h-full bg-[#f0f0f0] relative">
                               <div className="p-4 pt-10 space-y-3">
                                   {message ? (
                                       <div className="flex justify-start animate-fade-in-up">
                                           <div className="bg-slate-200 text-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-xs leading-relaxed border border-slate-300">
                                               {message}
                                           </div>
                                       </div>
                                   ) : (
                                       <div className="h-full flex items-center justify-center pt-20">
                                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Empty Message</p>
                                       </div>
                                   )}
                               </div>
                               <div className="absolute bottom-0 w-full h-14 bg-white border-t flex items-center px-4">
                                   <div className="w-full h-8 bg-slate-100 rounded-full border"></div>
                               </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .form-input:focus, .form-select:focus { ring: 2px; border-color: transparent; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.625rem 1.5rem; border-radius: 0.75rem; cursor: pointer; transition: all 0.2s; border: none; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2); }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
            `}</style>
        </div>
    );
};
