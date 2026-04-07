import React, { useState, useMemo } from 'react';
import type { AcademicLevel, Institution } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { PlusIcon } from './icons/PlusIcon';
import { isSchoolInstitution } from '../utils/roleUtils';


interface AcademicLevelManagerProps {
    academicLevels: AcademicLevel[];
    onAdd?: (name: string) => void;
    onUpdate?: (id: string, name: string) => void;
    onDelete?: (id: string) => void;
    currentInstitution?: Institution | null;
}

export const AcademicLevelManager: React.FC<AcademicLevelManagerProps> = ({ academicLevels, onAdd, onUpdate, onDelete, currentInstitution }) => {
    const [editingLevel, setEditingLevel] = useState<{ id: string; name: string } | null>(null);
    const [newLevelName, setNewLevelName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const isSchool = isSchoolInstitution(currentInstitution);
    const streamLabel = isSchool ? 'Stream' : 'Academic Level';
    const streamLabelPlural = isSchool ? 'Streams' : 'Academic Levels';

    const filteredLevels = useMemo(() => {
        if (!searchQuery.trim()) {
            return academicLevels;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return academicLevels.filter(level => 
            level.name.toLowerCase().includes(lowercasedQuery)
        );
    }, [academicLevels, searchQuery]);

    const handleUpdateSubmit = (id: string) => {
        if (editingLevel && editingLevel.name.trim() && typeof onUpdate === 'function') {
            onUpdate(id, editingLevel.name.trim());
            setEditingLevel(null);
        }
    };
    
    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newLevelName.trim() && typeof onAdd === 'function') {
            onAdd(newLevelName.trim());
            setNewLevelName('');
            setIsAdding(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl">
            <section className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Manage {streamLabelPlural}</h3>
                    {typeof onAdd === 'function' && (
                        <button onClick={() => setIsAdding(prev => !prev)} className="btn-primary inline-flex items-center gap-1 text-sm">
                            <PlusIcon className="w-4 h-4"/> New {streamLabel}
                        </button>
                    )}
                </div>
                {isAdding && typeof onAdd === 'function' && (
                    <form onSubmit={handleAddSubmit} className="flex gap-4 items-end bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm mb-4">
                        <div className="flex-grow">
                            <label htmlFor="level-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">New {streamLabel} Name</label>
                            <input
                                type="text"
                                id="level-name"
                                value={newLevelName}
                                onChange={(e) => setNewLevelName(e.target.value)}
                                className="mt-1 form-input"
                                placeholder={isSchool ? "e.g., Stream A, Junior Secondary" : "e.g., Undergraduate, Postgraduate"}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary h-fit">Add</button>
                    </form>
                )}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${streamLabelPlural.toLowerCase()} by name...`}
                        className="form-input w-full"
                    />
                </div>
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg">
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredLevels.map(level => (
                            <li key={level.id} className="p-4 flex items-center justify-between">
                                {editingLevel?.id === level.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editingLevel.name}
                                            onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })}
                                            className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && handleUpdateSubmit(level.id)}
                                        />
                                        <button onClick={() => handleUpdateSubmit(level.id)} className="p-2 rounded-md bg-green-100 hover:bg-green-200 text-green-700"><CheckIcon className="w-5 h-5"/></button>
                                        <button onClick={() => setEditingLevel(null)} className="p-2 rounded-md bg-slate-100 hover:bg-slate-200"><XIcon className="w-5 h-5"/></button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{level.name}</p>
                                        <div className="flex items-center gap-4">
                                            {typeof onUpdate === 'function' && <button onClick={() => setEditingLevel({ id: level.id, name: level.name })} className="text-sm font-medium text-[var(--color-primary)] hover:brightness-125">Edit</button>}
                                            {typeof onDelete === 'function' && <button onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete the ${streamLabel.toLowerCase()} "${level.name}"? This could affect existing course definitions.`)) {
                                                    onDelete(level.id);
                                                }
                                            }} className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Delete</button>}
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                         {filteredLevels.length === 0 && (
                            <li className="p-4 text-center text-sm text-slate-500">
                                No {streamLabelPlural.toLowerCase()} found.
                            </li>
                        )}
                    </ul>
                </div>
            </section>
        </div>
    );
};