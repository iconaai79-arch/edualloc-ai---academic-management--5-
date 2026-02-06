
import React, { useState, useEffect } from 'react';
import type { Institution, SubscriptionConfig } from './types';

interface EditInstitutionModalProps {
  institution: Institution;
  onClose: () => void;
  onSave: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
  defaultPrices: SubscriptionConfig;
}

export const EditInstitutionModal: React.FC<EditInstitutionModalProps> = ({ institution, onClose, onSave, defaultPrices }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    institutionType: 'University' as Institution['institutionType'],
    status: 'trial' as Institution['status'],
    trialEndsAt: '',
    subscriptionEndsAt: '',
    customSubscriptionPrice: {
        monthly: '',
        yearly: '',
    }
  });

  useEffect(() => {
    if (institution) {
      setFormData({
        name: institution.name,
        email: institution.email,
        phoneNumber: institution.phoneNumber,
        institutionType: institution.institutionType,
        status: institution.status,
        trialEndsAt: institution.trialEndsAt ? institution.trialEndsAt.split('T')[0] : '',
        subscriptionEndsAt: institution.subscriptionEndsAt ? institution.subscriptionEndsAt.split('T')[0] : '',
        customSubscriptionPrice: {
            monthly: institution.customSubscriptionPrice?.monthly?.toString() || '',
            yearly: institution.customSubscriptionPrice?.yearly?.toString() || '',
        }
      });
    }
  }, [institution]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        customSubscriptionPrice: {
            ...prev.customSubscriptionPrice,
            [name]: value,
        }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saveData: Partial<Omit<Institution, 'id'>> = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      institutionType: formData.institutionType,
      status: formData.status,
      trialEndsAt: formData.trialEndsAt ? new Date(formData.trialEndsAt).toISOString() : undefined,
      subscriptionEndsAt: formData.subscriptionEndsAt ? new Date(formData.subscriptionEndsAt).toISOString() : undefined,
      customSubscriptionPrice: {
        monthly: formData.customSubscriptionPrice.monthly ? parseFloat(formData.customSubscriptionPrice.monthly) : undefined,
        yearly: formData.customSubscriptionPrice.yearly ? parseFloat(formData.customSubscriptionPrice.yearly) : undefined,
      }
    };
    onSave(institution.id, saveData);
  };

  if (!institution) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Institution: {institution.name}</h3>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-inst-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Institution Name</label>
                <input
                  type="text"
                  id="edit-inst-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-inst-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  id="edit-inst-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-inst-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                <input
                  type="tel"
                  id="edit-inst-phone"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-inst-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Institution Type</label>
                <select
                  id="edit-inst-type"
                  name="institutionType"
                  value={formData.institutionType}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600"
                >
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="University">University</option>
                  <option value="College">College</option>
                  <option value="Institute">Institute</option>
                  <option value="Polytechnic">Polytechnic</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="text-sm font-bold uppercase text-slate-400 mb-3">Account Status & Expiry</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500">Status</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="mt-1 form-select text-sm">
                            <option value="trial">Trial</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500">Trial Ends At</label>
                        <input type="date" name="trialEndsAt" value={formData.trialEndsAt} onChange={handleChange} className="mt-1 form-input text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500">Subscription Ends At</label>
                        <input type="date" name="subscriptionEndsAt" value={formData.subscriptionEndsAt} onChange={handleChange} className="mt-1 form-input text-sm" />
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                 <h4 className="text-sm font-bold uppercase text-slate-400 mb-3">Custom Subscription Price</h4>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Leave blank to use the system default price.</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="edit-inst-monthly" className="block text-xs font-medium text-slate-500">Monthly (KES)</label>
                        <input
                            type="number"
                            id="edit-inst-monthly"
                            name="monthly"
                            value={formData.customSubscriptionPrice.monthly}
                            onChange={handlePriceChange}
                            className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder={`Default: KES ${defaultPrices.defaultMonthlyPrice}/mo`}
                            min="0"
                        />
                    </div>
                     <div>
                        <label htmlFor="edit-inst-yearly" className="block text-xs font-medium text-slate-500">Yearly (KES)</label>
                        <input
                            type="number"
                            id="edit-inst-yearly"
                            name="yearly"
                            value={formData.customSubscriptionPrice.yearly}
                            onChange={handlePriceChange}
                            className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder={`Default: KES ${defaultPrices.defaultYearlyPrice}/yr`}
                            min="0"
                        />
                    </div>
                 </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200 dark:border-slate-700">
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
