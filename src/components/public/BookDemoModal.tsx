
import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { SendIcon } from '../icons/SendIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { apiService } from '../../services/apiService';

interface BookDemoModalProps {
  onClose: () => void;
}

export const BookDemoModal: React.FC<BookDemoModalProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Record the demo request
      await apiService.saveModuleRecord('demo_requests', {
        id: `demo_${Date.now()}`,
        ...formData,
        status: 'new',
        requestedAt: new Date().toISOString()
      });

      // Notify Super Admins
      await apiService.notifySuperAdmins(`New Demo Request from ${formData.name} (${formData.institution})`, 'guest_arrival');
      
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Demo request failed:", error);
      alert("Submission failed. Please try again or contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Decor */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="p-10 relative">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                <SparklesIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                  Book a Demo
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Experience the Future of AI Management</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {isSuccess ? (
            <div className="py-12 text-center animate-fade-in-up">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100 dark:shadow-none">
                <CheckCircleIcon className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Request Received!</h4>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Our specialized team will contact you within 24 hours to schedule your neural walkthrough.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="demo-input" 
                    placeholder="Enter your name" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Corporate Email</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="demo-input" 
                    placeholder="name@institution.com" 
                    required 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Institution Name</label>
                  <input 
                    type="text" 
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    className="demo-input" 
                    placeholder="e.g. Nexus Academy" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Contact Phone</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="demo-input" 
                    placeholder="e.g. +254..." 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Context / Specific Needs</label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={3} 
                  className="demo-input resize-none" 
                  placeholder="Tell us about your management challenges..." 
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Initializing Request...
                  </>
                ) : (
                  <>
                    <SendIcon className="w-5 h-5" />
                    Schedule Neural Demo
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
      <style>{`
        .demo-input {
          display: block;
          width: 100%;
          height: 3.5rem;
          border-radius: 1.25rem;
          border: 1px solid #e2e8f0;
          padding: 0 1.25rem;
          background-color: #f8fafc;
          font-size: 0.75rem;
          font-weight: 700;
          transition: all 0.2s;
          color: #1e293b;
          outline: none;
        }
        .dark .demo-input {
          border-color: #334155;
          background-color: #0f172a;
          color: #fff;
        }
        .demo-input:focus {
          border-color: #4f46e5;
          background-color: #fff;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }
        textarea.demo-input {
          height: auto;
          padding: 1rem 1.25rem;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

