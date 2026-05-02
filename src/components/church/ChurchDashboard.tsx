import React from 'react';
import { useChurch } from './ChurchDenominationProvider';
import { CatholicView } from './catholic/CatholicView';
import { ProtestantView } from './protestant/ProtestantView';
import { OrthodoxView } from './orthodox/OrthodoxView';
import { UsersIcon as Users } from '../icons/UsersIcon';
import { CalendarDaysIcon as Calendar } from '../icons/CalendarDaysIcon';
import { ChatBubbleLeftRightIcon as MessageSquare } from '../icons/ChatBubbleLeftRightIcon';
import { ShieldIcon as ShieldCheck } from '../icons/ShieldIcon';
import { HeartIcon as Heart } from '../icons/HeartIcon';
import { UserPlusIcon as UserPlus } from '../icons/UserPlusIcon';

export const ChurchDashboard: React.FC = () => {
    const { denomination, currentChurch } = useChurch();

    const renderView = () => {
        switch (denomination) {
            case 'Catholic':
                return <CatholicView />;
            case 'Protestant':
            case 'Evangelical':
                return <ProtestantView />;
            case 'Orthodox':
                return <OrthodoxView />;
            default:
                return (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-600">Universal Church Management</h2>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            Welcome to {currentChurch?.name}. Please configure your denomination in the settings 
                            to unlock specialized features like Sacraments, Cell Groups, or Fasting Calendars.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="church-dashboard space-y-8 animate-in">
            {/* Header / Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<Users className="w-5 h-5 text-indigo-600" />} label="Total Members" value="1,280" trend="+12 this month" />
                <StatCard icon={<Calendar className="w-5 h-5 text-emerald-600" />} label="Next Service" value="Sunday 8:00 AM" trend="Preparation Active" />
                <StatCard icon={<MessageSquare className="w-5 h-5 text-orange-600" />} label="Pending Visitors" value="24" trend="Follow-up Required" />
                <StatCard icon={<ShieldCheck className="w-5 h-5 text-purple-600" />} label="Church Status" value="Active" trend="License OK" />
            </div>

            {/* Denomination-Specific Content */}
            <div className="church-content-area">
                {renderView()}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, trend?: string }> = ({ icon, label, value, trend }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        </div>
        <div className="text-2xl font-black text-slate-900 tracking-tighter">{value}</div>
        {trend && <div className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-wider">{trend}</div>}
    </div>
);

