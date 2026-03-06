import React, { useState } from 'react';
import type { User } from '../../types';
import { UsersIcon, SearchIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, PhoneIcon } from '../icons';

interface CarServiceCRMProps {
    users: User[];
}

export const CarServiceCRM: React.FC<CarServiceCRMProps> = ({ users }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter parents/customers
    const customers = users.filter((u) => u.role === 'parent' || u.role === 'admin' || u.role === 'mechanic_admin');
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber?.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="relative flex-1 md:max-w-md w-full">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search Customers by Name, Phone, Email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-sm outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 dark:bg-slate-900/20">
                {filteredCustomers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <UsersIcon className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">No Customers Found</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredCustomers.map(customer => (
                            <div key={customer.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-all group flex flex-col">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-black rounded-full flex items-center justify-center text-xl shadow-inner">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{customer.name}</h4>
                                        <p className="text-xs font-bold text-slate-500 uppercase">{customer.role.replace('_', ' ')}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 flex-1 mb-6">
                                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                                        <PhoneIcon className="w-4 h-4 text-slate-400" /> {customer.phoneNumber || 'No phone'}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                                        <EnvelopeIcon className="w-4 h-4 text-slate-400" /> <span className="truncate">{customer.email}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-auto border-t border-slate-100 dark:border-slate-700 pt-4">
                                    <button className="flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest">
                                        <ChatBubbleLeftRightIcon className="w-4 h-4" /> SMS
                                    </button>
                                    <button className="flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 hover:text-blue-600 text-slate-600 dark:text-slate-400 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest">
                                        <EnvelopeIcon className="w-4 h-4" /> Email
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
