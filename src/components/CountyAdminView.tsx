import React, { useState } from 'react';
import { User, Institution, County, AllocationRequest } from '../types';
import {
    BuildingOfficeIcon,
    UserGroupIcon,
    ChartPieIcon,
    ArrowRightOnRectangleIcon,
    AcademicCapIcon
} from './icons/index';
import { apiService } from '../services/apiService';

interface CountyAdminViewProps {
    currentUser: User;
    counties: County[];
    institutions: Institution[];
    users: User[];
    onLogout: () => void;
    onUpdateInstitution: (id: string, data: Partial<Institution>) => void;
}

export const CountyAdminView: React.FC<CountyAdminViewProps> = ({
    currentUser,
    counties,
    institutions,
    users,
    onLogout,
    onUpdateInstitution
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'institutions'>('dashboard');

    // Logic to find the admin's county. 
    // We match by adminName (text field) or email.
    const myCounty = counties.find(c =>
        (c.adminName && c.adminName.toLowerCase() === currentUser.name.toLowerCase()) ||
        (c.email && c.email.toLowerCase() === currentUser.email.toLowerCase())
    );

    const myInstitutions = institutions.filter(i => i.countyId === myCounty?.id);

    // Calculate stats
    const totalStudents = users.filter(u =>
        u.role === 'student' &&
        myInstitutions.some(i => i.id === u.institutionId)
    ).length;

    const totalLecturers = users.filter(u =>
        u.role === 'lecturer' &&
        myInstitutions.some(i => i.id === u.institutionId)
    ).length;

    if (!myCounty) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BuildingOfficeIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">No County Assigned</h2>
                    <p className="text-slate-500 mb-6">
                        We couldn't match your account to any county.<br />
                        Please ensure your name ({currentUser.name}) matches the "County Administrator" field in the county record.
                    </p>
                    <button
                        onClick={onLogout}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900 text-white p-6 flex flex-col z-50">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
                        <BuildingOfficeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight">County Portal</h1>
                        <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">
                            {myCounty.name}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                    >
                        <ChartPieIcon className="w-5 h-5" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('institutions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'institutions'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                    >
                        <AcademicCapIcon className="w-5 h-5" />
                        Institutions
                        <span className="ml-auto bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded-full">
                            {myInstitutions.length}
                        </span>
                    </button>
                </nav>

                <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <span className="font-bold text-indigo-300">{currentUser.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{currentUser.name}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-72 flex-1 p-8">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                {myCounty.name} Overview
                            </h2>
                            <p className="text-slate-500 font-medium">
                                Manage education resources for county code: {myCounty.code}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <AcademicCapIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">{myInstitutions.length}</h3>
                                <p className="text-slate-500 font-medium mt-1">Registered Institutions</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <UserGroupIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">{totalStudents}</h3>
                                <p className="text-slate-500 font-medium mt-1">Active Students</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                                        <UserGroupIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">{totalLecturers}</h3>
                                <p className="text-slate-500 font-medium mt-1">Lecturers</p>
                            </div>
                        </div>

                        {/* Recent Activity or List could go here */}
                    </div>
                )}

                {activeTab === 'institutions' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                Institutions
                            </h2>
                            <p className="text-slate-500 font-medium">
                                Schools and colleges within {myCounty.name}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myInstitutions.map(inst => (
                                <div key={inst.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                                            🏫
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${inst.status === 'active' ? 'bg-green-100 text-green-700' :
                                                inst.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {inst.status}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-tight mb-1">{inst.name}</h3>
                                    <p className="text-xs font-mono text-slate-500 mb-4">{inst.institutionCode} • {inst.institutionType}</p>

                                    <div className="space-y-2 text-sm text-slate-600 mb-6">
                                        <div className="flex items-center gap-2">
                                            <span>📧</span> {inst.email}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span>📞</span> {inst.phoneNumber}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {myInstitutions.length === 0 && (
                                <div className="col-span-full text-center py-12 bg-white rounded-[2rem] border border-slate-100">
                                    <p className="text-slate-400 font-bold">No institutions found in this county.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
