import React, { useState, useEffect } from 'react';
import type { User, Role, Department, UserUpdateData, Institution } from '../types';

interface EditUserModalProps {
  user: User;
  departments: Department[];
  onClose: () => void;
  // FIXED: Changed to async to match consumer usage
  onSave: (lecturerId: string, data: UserUpdateData) => Promise<void> | void;
  currentInstitution?: Institution | null;
  fixedDepartmentId?: string;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, departments, onClose, onSave, currentInstitution, fixedDepartmentId }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [staffId, setStaffId] = useState('');
  const [expertise, setExpertise] = useState('');
  const [role, setRole] = useState<Role>('lecturer');
  const [assignedDepartmentId, setAssignedDepartmentId] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhoneNumber(user.phoneNumber);
      setStaffId(user.staffId || '');
      setExpertise(user.expertise?.join(', ') || '');
      setRole(user.role);
      // Use fixed ID if provided, otherwise fallback to user's dept or empty
      setAssignedDepartmentId(fixedDepartmentId || user.departmentId || '');
      setGender(user.gender || 'Male');
    }
  }, [user, fixedDepartmentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expertiseArray = expertise.split(',').map(item => item.trim()).filter(Boolean);
    const rolesWithDepartment: Role[] = ['admin', 'deputy', 'hod', 'lecturer', 'tto', 'head_teacher', 'dos', 'teacher'];

    if (!isSchool && rolesWithDepartment.includes(role) && !assignedDepartmentId) {
      alert(`Please assign a department for the ${role.toUpperCase()}.`);
      return;
    }

    if (name.trim() && email.trim() && phoneNumber.trim() && staffId.trim()) {
      onSave(user.id, {
        name,
        email,
        phoneNumber,
        staffId,
        expertise: expertiseArray,
        role,
        departmentId: rolesWithDepartment.includes(role) ? assignedDepartmentId : undefined,
        gender
      });
      onClose();
    }
  };

  if (!user) return null;

  const rolesWithDepartment: Role[] = ['admin', 'deputy', 'hod', 'lecturer', 'tto', 'head_teacher', 'dos', 'teacher'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit User: {user.name}</h3>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="edit-user-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  id="edit-user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-user-gender" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <select
                  id="edit-user-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-user-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  id="edit-user-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-user-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                <input
                  type="tel"
                  id="edit-user-phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="e.g., 0712345678"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-user-staffid" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Staff ID</label>
                <input
                  type="text"
                  id="edit-user-staffid"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="edit-user-expertise" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Expertise (comma-separated)</label>
                <input
                  type="text"
                  id="edit-user-expertise"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="e.g., AI, Machine Learning"
                  required={user.role !== 'student'}
                />
              </div>

              <div>
                <label htmlFor="edit-user-role" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select
                  id="edit-user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600"
                  disabled={!!fixedDepartmentId && user.role === role} // Disable if restricted (HOD editing within dept)
                >
                  {isSchool ? (
                    <>
                      <option value="head_teacher">Head Teacher</option>
                      <option value="deputy">Deputy</option>
                      <option value="dos">DOS</option>
                      <option value="teacher">Teacher</option>
                      <option value="practice_teacher">Practice Teacher</option>
                      <option value="librarian">Librarian</option>
                      <option value="finance">Finance</option>
                      <option value="security">Security</option>
                      <option value="info_desk">Info Desk</option>
                      <option value="store">Storekeeper</option>
                    </>
                  ) : (
                    <>
                      <option value="lecturer">Lecturer</option>
                      <option value="hod">HOD</option>
                      <option value="tto">TTO</option>
                      <option value="admin">Chair TTO</option>
                      <option value="deputy">Deputy</option>
                      <option value="academics_officer">Academics Officer</option>
                      <option value="practice_teacher">Practice Teacher</option>
                      <option value="librarian">Librarian</option>
                      <option value="finance">Finance</option>
                      <option value="security">Security</option>
                      <option value="info_desk">Info Desk</option>
                      <option value="store">Storekeeper</option>
                    </>
                  )}
                </select>
              </div>

              {!isSchool && rolesWithDepartment.includes(role) && (
                <div>
                  <label htmlFor="edit-hod-department" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
                  <select
                    id="edit-hod-department"
                    value={assignedDepartmentId}
                    onChange={(e) => setAssignedDepartmentId(e.target.value)}
                    required
                    disabled={!!fixedDepartmentId}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 disabled:opacity-60"
                  >
                    <option value="" disabled>Select a department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}

            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-white hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:ml-3 sm:w-auto sm:text-sm"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};