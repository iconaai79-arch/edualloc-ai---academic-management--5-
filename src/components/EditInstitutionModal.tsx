
import React, { useState, useEffect } from 'react';
import type { Institution, SubscriptionConfig } from '../types';

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
    institutionType: 'University',
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
      institutionType: formData.institutionType as Institution['institutionType'],
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Institution: {institution.name}</h3>

            <div className="mt-6 space-y-4">
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
                  <option>Primary</option>
                  <option>Secondary</option>
                  <option>University</option>
                  <option>College</option>
                  <option>Institute</option>
                  <option>Polytechnic</option>
                  <option>ECD</option>
                  <option>International</option>
                </select>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Subscription Price</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Leave blank to use the system default price.</p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-inst-monthly" className="sr-only">Custom Monthly Price</label>
                    <input
                      type="number"
                      id="edit-inst-monthly"
                      name="monthly"
                      value={formData.customSubscriptionPrice.monthly}
                      onChange={handlePriceChange}
                      className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder={`Default: KES ${defaultPrices.defaultMonthlyPrice}/mo`}
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-inst-yearly" className="sr-only">Custom Yearly Price</label>
                    <input
                      type="number"
                      id="edit-inst-yearly"
                      name="yearly"
                      value={formData.customSubscriptionPrice.yearly}
                      onChange={handlePriceChange}
                      className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder={`Default: KES ${defaultPrices.defaultYearlyPrice}/yr`}
                      min="0"
                    />
                  </div>
                </div>
              </div>
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
