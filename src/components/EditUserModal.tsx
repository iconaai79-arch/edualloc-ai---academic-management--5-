import React, { useState, useEffect, useMemo } from 'react';
import type { User, Role, Department, UserUpdateData, Institution } from '../types';
import { RETAIL_SUBTYPES } from '../constants';
import { getRolesForInstitution, formatRoleDisplayName, isSchoolInstitution, isHigherEdInstitution } from '../utils/roleUtils';

interface EditUserModalProps {
  user: User;
  departments: Department[];
  onClose: () => void;
  // FIXED: Changed to async to match consumer usage
  onSave: (lecturerId: string, data: UserUpdateData) => Promise<void> | void;
  currentInstitution?: Institution | null;
  fixedDepartmentId?: string;
  isCoop?: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, departments, onClose, onSave, currentInstitution, fixedDepartmentId, isCoop: isCoopProp }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [staffId, setStaffId] = useState('');
  const [expertise, setExpertise] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignedDepartmentId, setAssignedDepartmentId] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [driverType, setDriverType] = useState<'staff' | 'private'>('staff');

  const isRetailAgency = RETAIL_SUBTYPES.includes(currentInstitution?.businessSubType || '');
  const isSchool = isSchoolInstitution(currentInstitution);
  const isHigherEd = isHigherEdInstitution(currentInstitution);
  const isEdu = isSchool || isHigherEd;
  const isCoop = useMemo(() => {
    if (typeof isCoopProp === 'boolean') return isCoopProp;
    const type = currentInstitution?.institutionType;
    const subType = currentInstitution?.businessSubType?.toLowerCase() || '';
    return type === 'Cooperative' || type === 'SACCO' || type === 'Agrovet' || subType.includes('coop') || subType.includes('sacco') || subType.includes('dairy') || subType.includes('tea') || subType.includes('coffee') || subType.includes('sugar');
  }, [currentInstitution, isCoopProp]);

  const isPm = useMemo(() => {
    const type = currentInstitution?.institutionType;
    const subType = currentInstitution?.businessSubType?.toLowerCase() || '';
    return type === 'Property Management' || subType.includes('property management');
  }, [currentInstitution]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhoneNumber(user.phoneNumber);
      setStaffId(user.staffId || '');
      setExpertise(user.expertise?.join(', ') || '');
      setRoles(Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role]);
      // Use fixed ID if provided, otherwise fallback to user's dept or empty
      setAssignedDepartmentId(fixedDepartmentId || user.departmentId || '');
      setGender(user.gender || 'Male');
      setDriverType(user.driverType || 'staff');
    }
  }, [user, fixedDepartmentId]);

  const toggleRole = (r: Role) => {
    setRoles(prev =>
      prev.includes(r)
        ? prev.filter(role => role !== r)
        : [...prev, r]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expertiseArray = expertise.split(',').map(item => item.trim()).filter(Boolean);
    const rolesWithDepartment: Role[] = ['admin', 'deputy', 'hod', 'lecturer', 'tto', 'head_teacher', 'dos', 'teacher'];

    if (roles.length === 0) {
      alert("Please select at least one role.");
      return;
    }

    const needsDepartment = roles.some(r => rolesWithDepartment.includes(r));

    if (!isSchool && !isCoop && !isPm && needsDepartment && !assignedDepartmentId && isEdu) {
      alert("Please assign a department for one of the selected professional roles.");
      return;
    }

    if (name.trim() && email.trim() && (phoneNumber.trim() || user.phoneNumber) && staffId.trim()) {
      const uniqueRoles = [...new Set(roles)];
      try {
        await onSave(user.id, {
          name,
          email,
          phoneNumber: phoneNumber || user.phoneNumber,
          staffId,
          expertise: expertiseArray,
          role: uniqueRoles[0], // Keep first as primary
          roles: uniqueRoles,
          departmentId: (needsDepartment && !isCoop && !isPm && isEdu) ? assignedDepartmentId : undefined,
          gender,
          driverType: roles.includes('driver') ? driverType : undefined
        });
        onClose();
      } catch (err: any) {
        alert("Persistence Failure: " + (err.message || "The records could not be synchronized with the cloud registry."));
      }
    }
  };

  const [activeTab, setActiveTab] = useState<'basic' | 'pro' | 'access'>('basic');

  if (!user) return null;

  const rolesWithDepartment: Role[] = ['admin', 'deputy', 'hod', 'lecturer', 'tto', 'head_teacher', 'dos', 'teacher'];

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              User Profile Registry
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Editing: {user.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="px-8 border-b border-slate-100 dark:border-slate-800 flex gap-8">
          {(['basic', 'pro', 'access'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'basic' ? 'Basic Info' : tab === 'pro' ? (isRetailAgency ? 'Experience' : (isCoop ? 'Experience / Stats' : 'Professional')) : 'Access Control'}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8_px_rgba(79,70,229,0.4)]" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-8 space-y-6 overflow-y-auto">
            {activeTab === 'basic' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="e.g. John Doe" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Gender Identity</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')} className="form-select">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="john@example.com" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Phone Contact</label>
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="form-input" placeholder="0712345678" required />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pro' && (
              <div className="space-y-6 animate-fade-in-up">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">{isRetailAgency ? 'ID Number' : (isCoop ? 'ID / Member Number' : 'Staff / Student ID')}</label>
                  <input type="text" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="form-input font-mono font-bold text-indigo-600 dark:text-indigo-400" placeholder={isRetailAgency ? "e.g. 12345678" : "EMP-001"} required />
                </div>
                {(isEdu || isRetailAgency || isCoop) && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">{isRetailAgency ? 'Skills / Experience' : (isCoop ? 'Farmer Stats / Expertise' : 'Expertise / Skills (comma separated)')}</label>
                    <textarea value={expertise} onChange={(e) => setExpertise(e.target.value)} rows={3} className="form-input resize-none" placeholder={isRetailAgency ? "e.g. Sales, Customer Service, Field Operations" : "e.g. Mathematics, Pedagogy, Sports Coaching"} required={user.role !== 'student'} />
                  </div>
                )}
                {roles.includes('driver') && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Driver Type</label>
                    <select value={driverType} onChange={(e) => setDriverType(e.target.value as 'staff' | 'private')} className="form-select">
                      <option value="staff">Official Staff</option>
                      <option value="private">Private / Outsourced</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'access' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1">Assigned Security Roles</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {getRolesForInstitution(currentInstitution).filter(r => !['customer', 'lead'].includes(r)).map((r) => (
                        <label key={r} className={`flex items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${roles.includes(r as Role) ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
                          <input
                            type="checkbox"
                            checked={roles.includes(r as Role)}
                            onChange={() => toggleRole(r as Role)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${roles.includes(r as Role) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500'}`}>
                            {formatRoleDisplayName(r as Role, currentInstitution)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {roles.some(r => rolesWithDepartment.includes(r)) && !isRetailAgency && isEdu && !isCoop && !isPm && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Assigned Department</label>
                      <select value={assignedDepartmentId} onChange={(e) => setAssignedDepartmentId(e.target.value)} required disabled={!!fixedDepartmentId} className="form-select disabled:opacity-60">
                        <option value="" disabled>Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Access Note</p>
                  <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80 leading-relaxed italic">Changes to roles or departments may affect system permissions and data visibility for this user.</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 flex justify-end items-center gap-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary h-12 px-8">Discard</button>
            <button type="submit" className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100 dark:shadow-none">Apply Unit Records</button>
          </div>
        </form>

      </div>
      <style>{`
        .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
        .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
        .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 1rem; border: none; cursor: pointer; transition: all 0.2s; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        .btn-secondary { background-color: #fff; color: #475569; font-weight: 700; padding: 0.5rem 1rem; border-radius: 1rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        .dark .btn-secondary { background-color: #1e293b; color: #cbd5e1; border-color: #334155; }
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
