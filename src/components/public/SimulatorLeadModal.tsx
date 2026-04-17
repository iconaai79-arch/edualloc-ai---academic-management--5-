
import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { UserIcon } from '../icons/UserIcon';
import { apiService } from '../../services/apiService';

interface SimulatorLeadModalProps {
  onClose: () => void;
  onSuccess: (name: string, phone: string) => void;
  moduleName: string;
}

export const SimulatorLeadModal: React.FC<SimulatorLeadModalProps> = ({ onClose, onSuccess, moduleName }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Record the lead as a DemoRequest
      await apiService.saveModuleRecord('demo_requests', {
        id: `lead_${Date.now()}`,
        name: formData.name,
        phone: formData.phone,
        email: 'simulator@guest.io',
        institution: `Simulator Guest (${moduleName})`,
        message: `User launched ${moduleName} simulator.`,
        status: 'new',
        requestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // Notify Super Admins
      await apiService.notifySuperAdmins(`New Lead: ${formData.name} phone ${formData.phone} just launched the ${moduleName} simulator.`, 'guest_arrival');
      
      onSuccess(formData.name, formData.phone);
    } catch (error) {
      console.error("Lead submission failed:", error);
      // Even if saving fails, let the user continue to the simulator so we don't block them 
      // but log it.
      onSuccess(formData.name, formData.phone);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar Decor */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-indigo-600 w-2/3 transition-all duration-1000 ease-out" />
        </div>
        
        <div className="p-8 pb-10 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none animate-pulse">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  One Step Away
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Initialize {moduleName} Environment</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
            Please provide your details to unlock the <strong>{moduleName}</strong> industrial simulator and receive a personalized walkthrough.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2 ml-1">Your Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="lead-input pl-12" 
                  placeholder="e.g. John Doe" 
                  required 
                />
              </div>
            </div>
            
            <div className="relative group">
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2 ml-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <PhoneIcon className="w-5 h-5" />
                </div>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="lead-input pl-12" 
                  placeholder="e.g. +254..." 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 mt-4 group"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Spinning Up Simulator...
                </>
              ) : (
                <>
                  Launch Simulator
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[9px] text-slate-400 mt-8 leading-relaxed">
            By launching, you agree to our terms of engagement. Our business development team may reach out to assist with your institutional deployment.
          </p>
        </div>
      </div>
      <style>{`
        .lead-input {
          display: block;
          width: 100%;
          height: 3.5rem;
          border-radius: 1.25rem;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
          color: #1e293b;
          outline: none;
        }
        .dark .lead-input {
          border-color: #334155;
          background-color: #0f172a;
          color: #fff;
        }
        .lead-input:focus {
          border-color: #4f46e5;
          background-color: #fff;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
