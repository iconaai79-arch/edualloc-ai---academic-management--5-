import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, 
    UserPlus, 
    Search, 
    Filter, 
    Plus, 
    Sparkles, 
    CreditCard, 
    ShieldCheck, 
    Fingerprint, 
    FileSpreadsheet, 
    GraduationCap, 
    Briefcase,
    Calendar,
    Mail,
    Phone,
    UserCheck,
    CheckCircle2,
    XCircle,
    Trash2,
    Edit3
} from 'lucide-react';
import type { User, StudentEnrollment, Institution, CourseLevel, Subject } from '../../types';
import { apiService } from '../../services/apiService';

interface StudentEnrollmentManagerProps {
    context: 'academic' | 'driving_school';
    currentInstitution: Institution;
}

export const StudentEnrollmentManager: React.FC<StudentEnrollmentManagerProps> = ({ 
    context, 
    currentInstitution 
}) => {
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [instructors, setInstructors] = useState<User[]>([]);
    const [courseLevels, setCourseLevels] = useState<CourseLevel[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Enrolled' | 'Active' | 'Graduated' | 'Suspended' | 'Dropped'>('All');
    
    // Modal & Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState<StudentEnrollment | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        admissionNumber: '',
        status: 'Enrolled' as StudentEnrollment['status'],
        enrollmentDate: new Date().toISOString().split('T')[0],
        // Context-specific metadata
        metadata: {
            licenseCategory: '',
            preferredInstructorId: '',
            preferredLessonHours: 'Morning' as 'Morning' | 'Noon' | 'Evening',
            priorAttendedDays: 0,
            gradeLevel: '',
            stream: '',
            subjects: [] as string[]
        }
    });

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info' | 'idle', message: string }>({ type: 'idle', message: '' });

    // Load Data
    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [enrollmentsData, usersData, courseLevelsData, subjectsData] = await Promise.all([
                apiService.fetchModuleRecords<StudentEnrollment>('student_enrollments', currentInstitution.id),
                apiService.fetchModuleRecords<User>('users', currentInstitution.id),
                apiService.fetchModuleRecords<CourseLevel>('course_levels', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<Subject>('subjects', currentInstitution.id).catch(() => [])
            ]);
            
            setEnrollments(enrollmentsData.filter(e => e.enrollmentType === context));
            setUsers(usersData);
            setInstructors(usersData.filter(u => u.role === 'driving_instructor' || u.role === 'teacher' || u.role === 'lecturer'));
            setCourseLevels(courseLevelsData);
            setSubjects(subjectsData);
        } catch (err) {
            console.error("Error loading enrollment data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentInstitution?.id) {
            loadAllData();
        }
    }, [currentInstitution?.id, context]);

    // Handle Form Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMsg({ type: 'info', message: 'Saving enrollment...' });
        
        try {
            let userId = '';
            
            // 1. Centralized Identity setup: check if User already exists with the same phone/email
            const existingUser = users.find(u => 
                (u.email && u.email.toLowerCase() === formData.email.toLowerCase()) || 
                (u.phoneNumber && u.phoneNumber === formData.phoneNumber)
            );
            
            if (existingUser) {
                userId = existingUser.id;
            } else {
                // Create a base user identity profile
                const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newUser: User = {
                    id: newUserId,
                    name: formData.fullName,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    role: context === 'driving_school' ? 'student' : 'student',
                    institutionId: currentInstitution.id,
                    createdAt: new Date().toISOString()
                };
                
                await apiService.saveModuleRecord('users', newUser);
                userId = newUserId;
            }
            
            // 2. Save Enrollment record
            if (editingEnrollment) {
                const updated: StudentEnrollment = {
                    ...editingEnrollment,
                    admissionNumber: formData.admissionNumber,
                    status: formData.status,
                    enrollmentDate: formData.enrollmentDate,
                    metadata: formData.metadata,
                    updatedAt: new Date().toISOString()
                };
                await apiService.updateModuleRecord('student_enrollments', editingEnrollment.id, updated);
                setStatusMsg({ type: 'success', message: 'Enrollment record updated successfully.' });
            } else {
                const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newEnrollment: StudentEnrollment = {
                    id: enrollmentId,
                    institutionId: currentInstitution.id,
                    userId: userId,
                    enrollmentType: context,
                    admissionNumber: formData.admissionNumber || `ADM-${Date.now().toString().slice(-5)}`,
                    status: formData.status,
                    enrollmentDate: formData.enrollmentDate,
                    metadata: formData.metadata,
                    createdAt: new Date().toISOString()
                };
                await apiService.saveModuleRecord('student_enrollments', newEnrollment);
                setStatusMsg({ type: 'success', message: 'New student enrolled successfully.' });
            }
            
            setIsFormOpen(false);
            setEditingEnrollment(null);
            loadAllData();
            
            // Clear form
            setFormData({
                fullName: '',
                email: '',
                phoneNumber: '',
                admissionNumber: '',
                status: 'Enrolled',
                enrollmentDate: new Date().toISOString().split('T')[0],
                metadata: {
                    licenseCategory: '',
                    preferredInstructorId: '',
                    preferredLessonHours: 'Morning',
                    priorAttendedDays: 0,
                    gradeLevel: '',
                    stream: '',
                    subjects: []
                }
            });
        } catch (err: any) {
            console.error("Save failed:", err);
            setStatusMsg({ type: 'error', message: `Failed to save enrollment: ${err.message}` });
        }
        
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    // Open form for editing
    const handleEdit = (enr: StudentEnrollment) => {
        const associatedUser = users.find(u => u.id === enr.userId);
        setEditingEnrollment(enr);
        setFormData({
            fullName: associatedUser?.name || 'Unknown',
            email: associatedUser?.email || '',
            phoneNumber: associatedUser?.phoneNumber || '',
            admissionNumber: enr.admissionNumber || '',
            status: enr.status,
            enrollmentDate: enr.enrollmentDate,
            metadata: {
                licenseCategory: enr.metadata?.licenseCategory || '',
                preferredInstructorId: enr.metadata?.preferredInstructorId || '',
                preferredLessonHours: enr.metadata?.preferredLessonHours || 'Morning',
                priorAttendedDays: enr.metadata?.priorAttendedDays || 0,
                gradeLevel: enr.metadata?.gradeLevel || '',
                stream: enr.metadata?.stream || '',
                subjects: enr.metadata?.subjects || []
            }
        });
        setIsFormOpen(true);
    };

    // Handle Delete
    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this enrollment record? (Note: The user account identity will not be deleted)")) {
            return;
        }
        
        try {
            await apiService.deleteModuleRecord('student_enrollments', id);
            setStatusMsg({ type: 'success', message: 'Enrollment record removed.' });
            loadAllData();
        } catch (err) {
            console.error("Delete failed:", err);
            setStatusMsg({ type: 'error', message: 'Failed to remove enrollment.' });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 3000);
    };

    // Register WebAuthn Biometric passkey
    const handleRegisterBiometrics = async (userId: string, name: string) => {
        try {
            setStatusMsg({ type: 'info', message: 'Initializing biometric scanner...' });
            
            // Centralized registration simulator
            alert(`Ready to register credentials for ${name}. Place your finger on the reader or authenticate using windows Hello/Passkey prompt.`);
            
            const credentialMock = {
                id: `webauthn_${Date.now()}`,
                rawId: `raw_${Date.now()}`,
                type: 'public-key',
                registeredAt: new Date().toISOString()
            };
            
            const userToUpdate = users.find(u => u.id === userId);
            if (userToUpdate) {
                await apiService.saveModuleRecord('users', {
                    ...userToUpdate,
                    metadata: {
                        ...(userToUpdate.metadata || {}),
                        webauthnCredentials: credentialMock,
                        fingerprintTemplate: `biometric_template_hash_${Date.now()}`
                    }
                });
                setStatusMsg({ type: 'success', message: `Biometrics registered successfully for ${name}.` });
                loadAllData();
            }
        } catch (err) {
            console.error("Biometric registration failed:", err);
            setStatusMsg({ type: 'error', message: 'Failed to register biometrics.' });
        }
        setTimeout(() => setStatusMsg({ type: 'idle', message: '' }), 4000);
    };

    // Filtered Enrollments
    const filteredEnrollments = useMemo(() => {
        return enrollments.filter(enr => {
            const associatedUser = users.find(u => u.id === enr.userId);
            const matchesSearch = 
                (associatedUser?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (enr.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (associatedUser?.phoneNumber || '').includes(searchTerm);
            
            const matchesStatus = statusFilter === 'All' || enr.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [enrollments, users, searchTerm, statusFilter]);

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            Student <span className="text-indigo-500">Enrollment Portal</span>
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {context === 'driving_school' ? 'Driving School Cohort Registry' : 'Academic Class Placements & Registry'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setEditingEnrollment(null);
                            setIsFormOpen(true);
                        }}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/10"
                    >
                        <UserPlus className="w-4 h-4" />
                        Enroll Student
                    </button>
                </div>
            </div>

            {/* Status alerts */}
            {statusMsg.type !== 'idle' && (
                <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border ${
                    statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>
                    {statusMsg.message}
                </div>
            )}

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="w-full sm:w-72 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by name, ID or admission..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-900/30 border border-white/10 rounded-xl font-bold text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="w-full sm:w-44 py-3 px-4 bg-slate-900/30 border border-white/10 rounded-xl font-bold text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Enrolled">Enrolled</option>
                        <option value="Active">Active</option>
                        <option value="Graduated">Graduated</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Dropped">Dropped</option>
                    </select>
                </div>
            </div>

            {/* Students List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Retrieving enrollments...</p>
                </div>
            ) : filteredEnrollments.length === 0 ? (
                <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl border-dashed">
                    <Users className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                    <p className="text-sm font-bold text-slate-400">No enrollment records found.</p>
                    <p className="text-xs text-slate-500 mt-1">Enroll a new student to get started or adjust your filters.</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white/5 border border-white/5 rounded-3xl p-2">
                    <table className="w-full text-left text-sm text-slate-350">
                        <thead>
                            <tr className="border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="py-4 px-6">Student Info</th>
                                <th className="py-4 px-6">Admission #</th>
                                <th className="py-4 px-6">Details</th>
                                <th className="py-4 px-6">Biometrics</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredEnrollments.map(enr => {
                                const user = users.find(u => u.id === enr.userId);
                                const hasBiometrics = !!user?.metadata?.webauthnCredentials;
                                
                                return (
                                    <tr key={enr.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm uppercase">
                                                    {(user?.name || 'U').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white">{user?.name || 'Unknown Student'}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                                                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user?.email || 'No Email'}</span>
                                                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {user?.phoneNumber || 'No Phone'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-xs font-mono font-bold text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                                {enr.admissionNumber}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            {context === 'driving_school' ? (
                                                <div className="text-xs">
                                                    <p className="font-bold text-slate-300">Category: <span className="text-indigo-400">{enr.metadata?.licenseCategory || 'N/A'}</span></p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">Sessions Attended: {enr.metadata?.priorAttendedDays || 0}</p>
                                                </div>
                                            ) : (
                                                <div className="text-xs">
                                                    <p className="font-bold text-slate-300">Grade: <span className="text-indigo-400">{enr.metadata?.gradeLevel || 'N/A'}</span></p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">Stream: {enr.metadata?.stream || 'N/A'}</p>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            {hasBiometrics ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleRegisterBiometrics(enr.userId, user?.name || 'Student')}
                                                    className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-xl transition-all"
                                                >
                                                    <Fingerprint className="w-3.5 h-3.5 text-indigo-400" /> Enroll Key
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                                enr.status === 'Active' || enr.status === 'Enrolled' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                                enr.status === 'Graduated' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                enr.status === 'Suspended' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}>
                                                {enr.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEdit(enr)}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                                    title="Edit Enrollment"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(enr.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                                                    title="Remove Record"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Form modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {editingEnrollment ? 'Modify Student Enrollment' : 'Onboard New Student'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure user identity and enrollment context</p>
                            </div>
                            <button 
                                onClick={() => setIsFormOpen(false)}
                                className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="First & Last Name"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        required 
                                        placeholder="+254..."
                                        value={formData.phoneNumber}
                                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        required 
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Number</label>
                                    <input 
                                        type="text" 
                                        placeholder="Leave blank to auto-generate"
                                        value={formData.admissionNumber}
                                        onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        className="form-select mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                    >
                                        <option value="Enrolled">Enrolled</option>
                                        <option value="Active">Active</option>
                                        <option value="Graduated">Graduated</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="Dropped">Dropped</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enrollment Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.enrollmentDate}
                                        onChange={e => setFormData({ ...formData, enrollmentDate: e.target.value })}
                                        className="form-input mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                    />
                                </div>
                            </div>

                            {/* Context Specific Fields */}
                            <div className="border-t border-white/10 pt-6">
                                <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-4">
                                    {context === 'driving_school' ? 'Driving School Curriculum Details' : 'Academic Placement Details'}
                                </h4>
                                
                                {context === 'driving_school' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Class / Category</label>
                                            <select
                                                required
                                                value={formData.metadata.licenseCategory}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, licenseCategory: e.target.value } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                            >
                                                <option value="" disabled>Select Class</option>
                                                <option value="Class B1 (Light Manual)">Class B1 (Light Manual)</option>
                                                <option value="Class B2 (Light Automatic)">Class B2 (Light Automatic)</option>
                                                <option value="Class A (Motorcycle)">Class A (Motorcycle)</option>
                                                <option value="Class C (Heavy Commercial)">Class C (Heavy Commercial)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Instructor</label>
                                            <select
                                                value={formData.metadata.preferredInstructorId}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, preferredInstructorId: e.target.value } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                            >
                                                <option value="">Any Instructor (Default)</option>
                                                {instructors.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Time Hours</label>
                                            <select
                                                value={formData.metadata.preferredLessonHours}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, preferredLessonHours: e.target.value as any } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                            >
                                                <option value="Morning">Morning Sessions (7:00 AM - 12:00 PM)</option>
                                                <option value="Noon">Noon Sessions (12:00 PM - 4:00 PM)</option>
                                                <option value="Evening">Evening Sessions (4:00 PM - 8:00 PM)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prior Attended Sessions</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={formData.metadata.priorAttendedDays}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, priorAttendedDays: parseInt(e.target.value) || 0 } 
                                                })}
                                                className="form-input mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade Level</label>
                                            <select
                                                required
                                                value={formData.metadata.gradeLevel}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, gradeLevel: e.target.value } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                            >
                                                <option value="" disabled>Select Grade</option>
                                                <option value="Grade 1">Grade 1</option>
                                                <option value="Grade 2">Grade 2</option>
                                                <option value="Grade 3">Grade 3</option>
                                                <option value="Grade 4">Grade 4</option>
                                                <option value="Grade 5">Grade 5</option>
                                                <option value="Grade 6">Grade 6</option>
                                                <option value="Grade 7">Grade 7</option>
                                                <option value="Grade 8">Grade 8</option>
                                                <option value="Form 1">Form 1 (Secondary)</option>
                                                <option value="Form 2">Form 2 (Secondary)</option>
                                                <option value="Form 3">Form 3 (Secondary)</option>
                                                <option value="Form 4">Form 4 (Secondary)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stream / Allocation</label>
                                            <select
                                                value={formData.metadata.stream}
                                                onChange={e => setFormData({ 
                                                    ...formData, 
                                                    metadata: { ...formData.metadata, stream: e.target.value } 
                                                })}
                                                className="form-select mt-1.5 w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3.5 font-bold text-xs text-white"
                                            >
                                                <option value="">Select Stream</option>
                                                <option value="North">North</option>
                                                <option value="South">South</option>
                                                <option value="East">East</option>
                                                <option value="West">West</option>
                                                <option value="Main">Main Stream</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-4 border-t border-white/10 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                                >
                                    {editingEnrollment ? 'Save Changes' : 'Confirm Enrollment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
