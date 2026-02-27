import React, { useState, useEffect } from 'react';
import type { User, Institution } from '../types';
import { apiService } from '../services/apiService';
import { BuildingOfficeIcon, UserGroupIcon, ChartBarIcon, ArrowRightOnRectangleIcon, PlusIcon, LockClosedIcon } from './icons';
import { SparklesIcon } from './icons';
import { generateAlphanumericCode } from '../utils/stringUtils';
import { generateId, generateUserId } from '../utils/idGenerator';

interface ResellerDashboardProps {
    currentUser: User;
    currentInstitution: Institution;
    onImpersonate: (tenantId: string) => void;
}

const ResellerDashboard: React.FC<ResellerDashboardProps> = ({ currentUser, currentInstitution, onImpersonate }) => {
    const [tenants, setTenants] = useState<Institution[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);

    // New Tenant Form State
    const [newTenantName, setNewTenantName] = useState('');
    const [newTenantEmail, setNewTenantEmail] = useState('');
    const [newTenantType, setNewTenantType] = useState<Institution['institutionType']>('Primary');

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const fetchedInstitutions = await apiService.fetchInstitutions();
                const myTenants = fetchedInstitutions.filter(inst => inst.resellerId === currentInstitution.id);
                setTenants(myTenants);

                // Fetch users for our tenants to get metrics
                const fetchedUsers = await apiService.fetchUsers();
                const tenantUserIds = myTenants.map(t => t.id);
                const usersInMyTenants = fetchedUsers.filter(u => tenantUserIds.includes(u.institutionId));
                setAllUsers(usersInMyTenants);
            } catch (error) {
                console.error("Error loading reseller data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentInstitution.id]);

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        const tenantId = generateId('inst');
        const adminId = generateUserId();

        console.log("Starting tenant onboarding process...", { tenantId, adminId });

        try {
            // Step 1: Prepare Institution
            const newInst: Institution = {
                id: tenantId,
                name: newTenantName,
                email: newTenantEmail,
                phoneNumber: '',
                institutionType: newTenantType,
                status: 'trial',
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                institutionCode: generateAlphanumericCode(6),
                resellerId: currentInstitution.id,
                isOtpEnabled: false,
                useAllocationRequests: true,
            };

            console.log("Step 1: Saving Institution...", newInst);
            try {
                await apiService.saveInstitution(newInst);
            } catch (instError: any) {
                console.error("Institution Save Failed:", instError);
                throw new Error(`Institution setup failed: ${instError.message || 'Database error'}`);
            }

            // Step 2: Prepare and Register Admin
            const newAdmin: Partial<User> = {
                id: adminId,
                name: `Admin - ${newTenantName}`,
                email: newTenantEmail,
                phoneNumber: '',
                role: 'admin',
                roles: ['admin'],
                institutionId: tenantId,
                expertise: ['Administration'],
            };

            console.log("Step 2: Registering Admin...", newAdmin);
            try {
                await apiService.registerUser(newAdmin, newTenantName);
            } catch (adminError: any) {
                console.error("Admin Registration Failed:", adminError);
                // We don't rollback the institution here to avoid potential data loss if it partially worked,
                // but we inform the user it was the user part that failed.
                throw new Error(`Admin account setup failed: ${adminError.message || 'Registration error'}`);
            }

            // Success
            const updatedTenants = [...tenants, newInst];
            setTenants(updatedTenants);
            setIsAddTenantModalOpen(false);

            // Reset form
            setNewTenantName('');
            setNewTenantEmail('');
            setNewTenantType('Primary');

            alert('Congratulations! The tenant and admin account have been successfully created.');
        } catch (error: any) {
            console.error("Critical Failure in handleCreateTenant:", error);
            alert(`detailed error report:\n\n${error.message}\n\nCheck the browser console (Inspect > Console) for full technical logs.`);
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const trialTenants = tenants.filter(t => t.status === 'trial').length;
    const totalUsers = allUsers.length;

    if (isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center">
                <SparklesIcon className="w-8 h-8 text-indigo-500 animate-pulse mb-4" />
                <p className="text-slate-500 font-medium">Loading your portfolio...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in p-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Reseller Portal: {currentInstitution.name}
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your clients and oversee operations.</p>
                </div>
                <button
                    onClick={() => setIsAddTenantModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Onboard New Client
                </button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                        <BuildingOfficeIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active Clients</p>
                        <p className="text-3xl font-bold text-slate-800">{activeTenants}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                        <ChartBarIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Trial Clients</p>
                        <p className="text-3xl font-bold text-slate-800">{trialTenants}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                        <UserGroupIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Managed Users</p>
                        <p className="text-3xl font-bold text-slate-800">{totalUsers}</p>
                    </div>
                </div>
            </div>

            {/* Client List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">Your Portfolio</h2>
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64 transition-all"
                    />
                </div>

                {filteredTenants.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <BuildingOfficeIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-700">No clients found</p>
                        <p className="text-sm">You haven't onboarded any clients yet, or no clients match your search.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Name</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</th>
                                    <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTenants.map(tenant => {
                                    const tenantUsers = allUsers.filter(u => u.institutionId === tenant.id).length;
                                    return (
                                        <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="font-medium text-slate-800">{tenant.name}</div>
                                                <div className="text-sm text-slate-500">{tenant.email}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                    {tenant.institutionType}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tenant.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                    tenant.status === 'trial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                        'bg-red-100 text-red-800 border border-red-200'
                                                    }`}>
                                                    {tenant.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <UserGroupIcon className="w-4 h-4 text-slate-400" />
                                                    <span className="font-medium">{tenantUsers}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => onImpersonate(tenant.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                                    title="Log in as this client to provide support"
                                                >
                                                    <LockClosedIcon className="w-4 h-4" />
                                                    Access Portal
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Tenant Modal */}
            {isAddTenantModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-800">Onboard New Client</h3>
                            <button onClick={() => setIsAddTenantModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Close</span>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Client / Institution Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newTenantName}
                                    onChange={(e) => setNewTenantName(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Greenwood High School"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newTenantEmail}
                                    onChange={(e) => setNewTenantEmail(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="admin@greenwood.com"
                                />
                                <p className="text-xs text-slate-500 mt-1">We will create a default admin account with this email.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Institution Type</label>
                                <select
                                    value={newTenantType}
                                    onChange={(e) => setNewTenantType(e.target.value as any)}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="Primary">Primary School</option>
                                    <option value="Secondary">Secondary School</option>
                                    <option value="University">University</option>
                                    <option value="College">College</option>
                                    <option value="Business">Business (Agrovet/Property)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddTenantModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                                >
                                    Provision Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResellerDashboard;
